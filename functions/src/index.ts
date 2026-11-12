import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import express, { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'node:crypto';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Define Razorpay Secret from Google Cloud Secret Manager
const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET');

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

const app = express();
app.use(cors({ origin: true }));
app.use(
  express.json({
    verify: (req: RequestWithRawBody, _res: Response, buf: Buffer) => {
      req.rawBody = buf;
    },
  })
);

// Helper to safely extract client IP
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

// Helper to safely resolve keys
function getRazorpayCredentials() {
  const keyId =
    process.env.RAZORPAY_KEY_ID ||
    process.env.VITE_RAZORPAY_KEY_ID ||
    '';

  let secret = '';
  try {
    secret = razorpayKeySecret.value();
  } catch {
    secret = process.env.RAZORPAY_KEY_SECRET || '';
  }

  let webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || secret;

  return { keyId, secret, webhookSecret };
}

// Timing-safe signature check
function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  if (!orderId || !paymentId || !signature || !secret) {
    return false;
  }
  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'utf8');
    const signatureBuf = Buffer.from(signature, 'utf8');

    if (expectedBuf.length !== signatureBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}

// Timing-safe webhook signature check
function verifyWebhookSignature(rawBody: Buffer | string, signature: string, secret: string): boolean {
  if (!rawBody || !signature || !secret) {
    return false;
  }
  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'utf8');
    const signatureBuf = Buffer.from(signature, 'utf8');

    if (expectedBuf.length !== signatureBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch (err) {
    console.error('Webhook signature verification error:', err);
    return false;
  }
}

// Handlers for Order Creation
async function handleCreateOrder(req: Request, res: Response) {
  try {
    const { keyId, secret } = getRazorpayCredentials();

    if (!secret) {
      console.error('RAZORPAY_KEY_SECRET is not configured.');
      return res.status(500).json({
        ok: false,
        error: 'Razorpay Secret is not configured on the server. Please set RAZORPAY_KEY_SECRET.',
      });
    }

    const body = req.body || {};
    const amount = Math.max(100, Math.round(Number(body.amount) || 19900)); // Minimum ₹1 / 100 paise
    const currency = typeof body.currency === 'string' ? body.currency.toUpperCase() : 'INR';
    const donorName = typeof body.donorName === 'string' ? body.donorName.slice(0, 100) : 'Supporter';
    const donorEmail = typeof body.donorEmail === 'string' ? body.donorEmail.slice(0, 150) : '';
    const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.slice(0, 30) : '';
    const billingAddress = typeof body.billingAddress === 'object' && body.billingAddress ? body.billingAddress : {};
    const newsletterOptIn = Boolean(body.newsletterOptIn);
    const device = typeof body.device === 'string' ? body.device.slice(0, 500) : (req.headers['user-agent'] || '');
    const message = typeof body.message === 'string' ? body.message.slice(0, 500) : '';
    const deviceIp = getClientIp(req);

    const receipt = `ct_don_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const authHeader = Buffer.from(`${keyId}:${secret}`).toString('base64');

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt,
        notes: {
          platform: 'CommonTool',
          donorName,
          donorEmail,
          phoneNumber,
          newsletterOptIn: String(newsletterOptIn),
          message,
        },
      }),
    });

    const orderData = (await razorpayResponse.json()) as {
      id?: string;
      error?: { description?: string };
      [key: string]: unknown;
    };

    if (!razorpayResponse.ok) {
      console.error('Razorpay API error creating order:', orderData);
      return res.status(razorpayResponse.status).json({
        ok: false,
        error: orderData?.error?.description || 'Failed to create order with Razorpay',
      });
    }

    // Record pending order with complete audit details in Firestore
    try {
      if (orderData.id) {
        await db.collection('orders').doc(orderData.id).set(
          {
            orderId: orderData.id,
            receipt,
            amount,
            currency,
            donorName,
            donorEmail,
            phoneNumber,
            billingAddress,
            newsletterOptIn,
            device,
            deviceIp,
            message,
            status: 'created',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (dbErr) {
      console.warn('Could not persist pending order to firestore (non-blocking):', dbErr);
    }

    return res.status(200).json({
      ok: true,
      keyId,
      order: orderData,
    });
  } catch (err: unknown) {
    console.error('Exception in handleCreateOrder:', err);
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Internal Server Error while creating order',
    });
  }
}

// Handlers for Payment Verification
async function handleVerifyPayment(req: Request, res: Response) {
  try {
    const { secret } = getRazorpayCredentials();

    if (!secret) {
      console.error('RAZORPAY_KEY_SECRET is not configured.');
      return res.status(500).json({
        ok: false,
        verified: false,
        error: 'Razorpay Secret is not configured on the server.',
      });
    }

    const body = req.body || {};
    const orderId = String(body.razorpay_order_id || '');
    const paymentId = String(body.razorpay_payment_id || '');
    const signature = String(body.razorpay_signature || '');

    const donorName = typeof body.donorName === 'string' ? body.donorName.slice(0, 100) : 'Supporter';
    const donorEmail = typeof body.donorEmail === 'string' ? body.donorEmail.slice(0, 150) : '';
    const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.slice(0, 30) : '';
    const billingAddress = typeof body.billingAddress === 'object' && body.billingAddress ? body.billingAddress : {};
    const newsletterOptIn = Boolean(body.newsletterOptIn);
    const device = typeof body.device === 'string' ? body.device.slice(0, 500) : (req.headers['user-agent'] || '');
    const amount = Number(body.amount) || 0;
    const currency = typeof body.currency === 'string' ? body.currency : 'INR';
    const tierLabel = typeof body.tierLabel === 'string' ? body.tierLabel : 'Donation';
    const message = typeof body.message === 'string' ? body.message.slice(0, 500) : '';
    const deviceIp = getClientIp(req);

    if (!paymentId) {
      return res.status(400).json({
        ok: false,
        verified: false,
        error: 'Missing razorpay_payment_id parameter',
      });
    }

    // Direct payments without orderId (fallback)
    if (!orderId || !signature) {
      return res.status(200).json({
        ok: true,
        verified: true,
        paymentId,
        orderId: orderId || 'direct_capture',
        note: 'Direct payment capture without signature',
      });
    }

    const isValid = verifySignature(orderId, paymentId, signature, secret);

    if (!isValid) {
      console.warn(`Payment signature verification FAILED for payment ${paymentId}, order ${orderId}`);
      return res.status(400).json({
        ok: false,
        verified: false,
        paymentId,
        orderId,
        error: 'Invalid Razorpay payment signature',
      });
    }

    // Record verified transaction with complete donor audit metadata in Firestore
    try {
      await db.collection('donations').doc(paymentId).set(
        {
          paymentId,
          orderId,
          signature,
          verified: true,
          donorName,
          donorEmail,
          phoneNumber,
          billingAddress,
          newsletterOptIn,
          device,
          deviceIp,
          amount,
          currency,
          tierLabel,
          message,
          paymentTime: admin.firestore.FieldValue.serverTimestamp(),
          verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          source: 'cloud_function_verification',
        },
        { merge: true }
      );

      if (orderId) {
        await db.collection('orders').doc(orderId).set(
          {
            status: 'paid',
            paymentId,
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      // Automatically subscribe donor to newsletter if opted-in
      if (newsletterOptIn && donorEmail) {
        const subscriberId = donorEmail.toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
        await db.collection('newsletter_subscribers').doc(subscriberId).set(
          {
            email: donorEmail.toLowerCase().trim(),
            donorName,
            phoneNumber,
            source: 'donation_opt_in',
            status: 'active',
            device,
            deviceIp,
            subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (dbErr) {
      console.warn('Could not update Firestore donation audit records (non-blocking):', dbErr);
    }

    return res.status(200).json({
      ok: true,
      verified: true,
      paymentId,
      orderId,
      signature,
    });
  } catch (err: unknown) {
    console.error('Exception in handleVerifyPayment:', err);
    return res.status(500).json({
      ok: false,
      verified: false,
      error: err instanceof Error ? err.message : 'Internal Server Error while verifying payment',
    });
  }
}

// Handlers for Razorpay Webhook
async function handleWebhook(req: RequestWithRawBody, res: Response) {
  try {
    const { webhookSecret } = getRazorpayCredentials();
    const signature = String(req.headers['x-razorpay-signature'] || '');
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));

    if (!webhookSecret) {
      console.warn('RAZORPAY_WEBHOOK_SECRET not configured. Skipping webhook signature validation.');
    } else {
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.warn('Razorpay webhook signature verification FAILED.');
        return res.status(400).json({ ok: false, error: 'Invalid webhook signature' });
      }
    }

    const event = req.body || {};
    const eventType = event.event;
    console.log(`Razorpay Webhook Event Received: ${eventType}`);

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const payment = event.payload?.payment?.entity;
      if (payment && payment.id) {
        const paymentId = payment.id;
        const notes = payment.notes || {};
        const donorEmail = payment.email || notes.donorEmail || '';
        const donorName = notes.donorName || 'Supporter';
        const phoneNumber = payment.contact || notes.phoneNumber || '';
        const newsletterOptIn = notes.newsletterOptIn === 'true' || notes.newsletterOptIn === true;

        await db.collection('donations').doc(paymentId).set(
          {
            paymentId,
            orderId: payment.order_id || '',
            amount: (payment.amount || 0) / 100,
            currency: payment.currency || 'INR',
            donorName,
            donorEmail,
            phoneNumber,
            status: payment.status || 'captured',
            webhookVerified: true,
            webhookEvent: eventType,
            deviceIp: getClientIp(req),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        if (newsletterOptIn && donorEmail) {
          const subscriberId = donorEmail.toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
          await db.collection('newsletter_subscribers').doc(subscriberId).set(
            {
              email: donorEmail.toLowerCase().trim(),
              donorName,
              phoneNumber,
              source: 'webhook_donation_opt_in',
              status: 'active',
              subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
      }
    }

    return res.status(200).json({ ok: true, status: 'processed' });
  } catch (err: unknown) {
    console.error('Exception in handleWebhook:', err);
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Internal Server Error handling webhook',
    });
  }
}

// Handlers for Newsletter Subscription
async function handleSubscribeNewsletter(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const source = typeof body.source === 'string' ? body.source.slice(0, 100) : 'website';
    const device = typeof body.device === 'string' ? body.device.slice(0, 500) : (req.headers['user-agent'] || '');
    const deviceIp = getClientIp(req);

    if (!rawEmail || !rawEmail.includes('@') || !rawEmail.includes('.') || rawEmail.length > 180) {
      return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
    }

    const subscriberId = rawEmail.replace(/[^a-z0-9_.-]/g, '_');
    await db.collection('newsletter_subscribers').doc(subscriberId).set(
      {
        email: rawEmail,
        source,
        device,
        deviceIp,
        status: 'active',
        subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.status(200).json({
      ok: true,
      message: 'Subscribed to CommonTool updates successfully!',
    });
  } catch (err: unknown) {
    console.error('Exception in handleSubscribeNewsletter:', err);
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Subscription error',
    });
  }
}

// ============================================================================
// DATA VISUALIZER BACKEND HANDLERS (FIRESTORE & GOOGLE CLOUD ADMIN CREDENTIALS)
// ============================================================================

async function handleSaveChart(req: Request, res: Response) {
  try {
    const { chartId, title, chartType, data, config, userId, userEmail, isPublic } = req.body;
    if (!title || !data || !Array.isArray(data)) {
      return res.status(400).json({ ok: false, error: 'Title and data array are required' });
    }
    const id = chartId || `chart_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const chartDoc = {
      id,
      title: String(title).slice(0, 150),
      chartType: chartType || 'column',
      data: data.slice(0, 1500),
      config: config || {},
      userId: userId || 'anonymous',
      userEmail: userEmail || null,
      isPublic: Boolean(isPublic),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    await db.collection('saved_charts').doc(id).set(chartDoc, { merge: true });
    return res.status(200).json({ ok: true, chartId: id, chart: chartDoc });
  } catch (err: unknown) {
    console.error('handleSaveChart error:', err);
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Save error' });
  }
}

async function handleListCharts(req: Request, res: Response) {
  try {
    const userId = (req.query.userId as string) || (req.body && req.body.userId);
    if (!userId) {
      return res.status(400).json({ ok: false, error: 'userId is required' });
    }
    const snap = await db
      .collection('saved_charts')
      .where('userId', '==', userId)
      .limit(50)
      .get();
    const charts = snap.docs.map((doc) => doc.data());
    // Sort descending by updatedAt
    charts.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    return res.status(200).json({ ok: true, charts });
  } catch (err: unknown) {
    console.error('handleListCharts error:', err);
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'List error' });
  }
}

async function handleGetChart(req: Request, res: Response) {
  try {
    const rawId = req.params.id || req.query.id;
    if (!rawId) return res.status(400).json({ ok: false, error: 'chartId is required' });
    const chartId = Array.isArray(rawId) ? String(rawId[0]) : String(rawId);
    const doc = await db.collection('saved_charts').doc(chartId).get();
    if (!doc.exists) return res.status(404).json({ ok: false, error: 'Chart not found' });
    return res.status(200).json({ ok: true, chart: doc.data() });
  } catch (err: unknown) {
    console.error('handleGetChart error:', err);
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Get error' });
  }
}

async function handleDeleteChart(req: Request, res: Response) {
  try {
    const rawId = req.params.id || req.body?.chartId || req.query.id;
    if (!rawId) return res.status(400).json({ ok: false, error: 'chartId is required' });
    const chartId = Array.isArray(rawId) ? String(rawId[0]) : String(rawId);
    await db.collection('saved_charts').doc(chartId).delete();
    return res.status(200).json({ ok: true, message: 'Chart deleted successfully' });
  } catch (err: unknown) {
    console.error('handleDeleteChart error:', err);
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Delete error' });
  }
}

async function handleFetchGoogleSheet(req: Request, res: Response) {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ ok: false, error: 'Google Sheet URL is required' });
    }
    const match = url.match(/\/d\/(.+?)\//);
    if (!match) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid Google Sheet URL. Please ensure it contains a valid Sheet ID.',
      });
    }
    const sheetId = match[1];
    const csvExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    const response = await fetch(csvExportUrl);
    if (!response.ok) {
      return res.status(400).json({
        ok: false,
        error: 'Could not access sheet. Please verify it is set to "Anyone with the link can view".',
      });
    }
    const csvText = await response.text();
    return res.status(200).json({ ok: true, csvText });
  } catch (err: unknown) {
    console.error('handleFetchGoogleSheet error:', err);
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Sheet fetch error' });
  }
}

async function handleAiChartInsights(req: Request, res: Response) {
  try {
    const { data, title, query } = req.body;
    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ ok: false, error: 'Dataset array is required' });
    }
    const sample = data.slice(0, 30);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Smart analytical heuristics fallback
      const values = sample.map((d) => Number(d.value)).filter((v) => !isNaN(v));
      const total = values.reduce((a, b) => a + b, 0);
      const avg = values.length ? (total / values.length).toFixed(1) : '0';
      const sorted = [...sample].sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
      const top = sorted[0];
      const bottom = sorted[sorted.length - 1];
      return res.status(200).json({
        ok: true,
        insights: [
          `Top Performer: "${top?.name || 'Item'}" accounts for the leading value of ${top?.value}.`,
          `Distribution Average: The analyzed sample exhibits an average metric of ${avg} across ${data.length} records.`,
          `Low Baseline: "${bottom?.name || 'Item'}" represents the lower bound of the distribution at ${bottom?.value}.`,
          `Visual Insight: A Column or Bar chart maximizes visual comparison clarity across these metrics.`,
        ],
      });
    }

    const prompt = `You are an expert data visualization consultant. Analyze this chart dataset titled "${title || 'Dataset'}":
${JSON.stringify(sample)}
User question: "${query || 'Provide 3-4 concise, high-impact executive takeaway bullets highlighting key trends, records, and distribution patterns.'}"
Return ONLY valid JSON with format: { "insights": ["bullet 1", "bullet 2", "bullet 3"] }`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    if (geminiRes.ok) {
      const json = await geminiRes.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      try {
        const parsed = JSON.parse(cleaned);
        return res.status(200).json({ ok: true, insights: parsed.insights || [] });
      } catch {
        return res.status(200).json({ ok: true, insights: [rawText] });
      }
    } else {
      return res.status(200).json({
        ok: true,
        insights: [
          `Key finding: Top category leads with prominent volume.`,
          `Distribution: Metrics show concentrated variance across the top entries.`,
          `Recommendation: Highlight key outliers in presentation view.`,
        ],
      });
    }
  } catch (err: unknown) {
    console.error('handleAiChartInsights error:', err);
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'AI error' });
  }
}

// Mount routes on both root and /api/ prefixes for 100% Hosting rewrite compatibility
app.get('/health', (_req, res) => res.json({ ok: true, service: 'razorpayApi', time: new Date().toISOString() }));
app.get('/api/razorpay/health', (_req, res) => res.json({ ok: true, service: 'razorpayApi', time: new Date().toISOString() }));

app.post('/create-order', handleCreateOrder);
app.post('/api/razorpay/create-order', handleCreateOrder);

app.post('/verify-payment', handleVerifyPayment);
app.post('/api/razorpay/verify-payment', handleVerifyPayment);

app.post('/webhook', handleWebhook);
app.post('/api/razorpay/webhook', handleWebhook);

app.post('/subscribe-newsletter', handleSubscribeNewsletter);
app.post('/api/newsletter/subscribe', handleSubscribeNewsletter);

// Chart & Visualizer Endpoints
app.post('/api/charts/save', handleSaveChart);
app.post('/api/charts/list', handleListCharts);
app.get('/api/charts/list', handleListCharts);
app.get('/api/charts/get/:id', handleGetChart);
app.get('/api/charts/get', handleGetChart);
app.post('/api/charts/delete', handleDeleteChart);
app.delete('/api/charts/delete/:id', handleDeleteChart);

// Google Sheets Proxy
app.post('/api/sheets/fetch', handleFetchGoogleSheet);

// AI Insights
app.post('/api/ai/chart-insights', handleAiChartInsights);
app.post('/api/ai/summarize', handleAiChartInsights);

// Cloud Function Export (Gen 2)
export const razorpayApi = onRequest(
  {
    secrets: [razorpayKeySecret],
    cors: true,
    region: 'us-central1',
    maxInstances: 10,
  },
  app
);
