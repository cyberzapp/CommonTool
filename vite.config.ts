import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const env = loadEnv('development', process.cwd(), '');
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID || 'rzp_test_RukOz4cBQyvFQE';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || env.RAZORPAY_KEY_SECRET || '';

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function razorpayApiPlugin(): Plugin {
  const handleMiddleware = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url) return next();

    if (req.url === '/api/razorpay/create-order' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const amount = Math.max(100, Math.round(Number(body.amount) || 19900));
        const currency = typeof body.currency === 'string' ? body.currency.toUpperCase() : 'INR';
        const donorName = typeof body.donorName === 'string' ? body.donorName : 'Supporter';
        const donorEmail = typeof body.donorEmail === 'string' ? body.donorEmail : '';
        const message = typeof body.message === 'string' ? body.message : '';

        const authHeader = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
        const receipt = `ct_don_${Date.now()}`;

        const response = await fetch('https://api.razorpay.com/v1/orders', {
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

        const orderData = (await response.json()) as {
          id?: string;
          error?: { description?: string };
          [key: string]: unknown;
        };
        if (!response.ok) {
          return sendJson(res, response.status, {
            ok: false,
            error: orderData?.error?.description || 'Failed to create Razorpay order',
          });
        }

        return sendJson(res, 200, {
          ok: true,
          keyId: RAZORPAY_KEY_ID,
          order: orderData,
        });
      } catch (err: unknown) {
        return sendJson(res, 500, {
          ok: false,
          error: err instanceof Error ? err.message : 'Order creation error',
        });
      }
    }

    if (req.url === '/api/razorpay/verify-payment' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const orderId = String(body.razorpay_order_id || '');
        const paymentId = String(body.razorpay_payment_id || '');
        const signature = String(body.razorpay_signature || '');

        if (!paymentId) {
          return sendJson(res, 400, { ok: false, verified: false, error: 'Missing payment ID' });
        }

        if (orderId && signature) {
          const expectedSignature = crypto
            .createHmac('sha256', RAZORPAY_KEY_SECRET)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');

          const isValid = expectedSignature === signature;
          return sendJson(res, isValid ? 200 : 400, {
            ok: isValid,
            verified: isValid,
            paymentId,
            orderId,
            signature,
          });
        }

        return sendJson(res, 200, {
          ok: true,
          verified: true,
          paymentId,
          orderId: orderId || 'direct_checkout',
        });
      } catch (err: unknown) {
        return sendJson(res, 500, {
          ok: false,
          verified: false,
          error: err instanceof Error ? err.message : 'Verification error',
        });
      }
    }

    next();
  };

  return {
    name: 'commontool-razorpay-api',
    configureServer(server) {
      server.middlewares.use(handleMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleMiddleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), razorpayApiPlugin()],
});
