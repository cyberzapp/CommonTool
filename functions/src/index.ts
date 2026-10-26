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

// Define Razorpay Key Secret from Google Cloud Secret Manager
const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

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

  return { keyId, secret };
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
    const message = typeof body.message === 'string' ? body.message.slice(0, 500) : '';

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

    // Optionally record pending order in Firestore
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

    // Record verified transaction securely in Firestore
    try {
      await db.collection('donations').doc(paymentId).set(
        {
          paymentId,
          orderId,
          signature,
          verified: true,
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
    } catch (dbErr) {
      console.warn('Could not update Firestore verification state (non-blocking):', dbErr);
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

// Mount routes on both root and /api/razorpay prefixes for 100% Hosting rewrite compatibility
app.get('/health', (_req, res) => res.json({ ok: true, service: 'razorpayApi', time: new Date().toISOString() }));
app.get('/api/razorpay/health', (_req, res) => res.json({ ok: true, service: 'razorpayApi', time: new Date().toISOString() }));

app.post('/create-order', handleCreateOrder);
app.post('/api/razorpay/create-order', handleCreateOrder);

app.post('/verify-payment', handleVerifyPayment);
app.post('/api/razorpay/verify-payment', handleVerifyPayment);

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
