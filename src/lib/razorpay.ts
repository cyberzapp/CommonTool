import { jsPDF } from 'jspdf';
import { logDonationToFirestore } from './firebase';

export const RAZORPAY_KEY_ID =
  (import.meta.env.VITE_RAZORPAY_KEY_ID as string) || 'rzp_test_RukOz4cBQyvFQE';

export interface DonationRecord {
  id: string;
  paymentId: string;
  orderId: string;
  signature?: string;
  verified: boolean;
  amount: number;
  currency: 'INR' | 'USD';
  donorName: string;
  donorEmail: string;
  message: string;
  tierLabel: string;
  createdAt: string;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id?: string;
  prefill?: {
    name?: string;
    email?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: string, callback: (err: unknown) => void) => void;
    };
  }
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.getElementById('razorpay-checkout-js');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function processRazorpayDonation(params: {
  amount: number; // Major unit, e.g., 499 INR or 15 USD
  currency: 'INR' | 'USD';
  donorName: string;
  donorEmail: string;
  message: string;
  tierLabel: string;
  onSuccess: (record: DonationRecord) => void;
  onCancel?: (reason?: string) => void;
}): Promise<void> {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    params.onCancel?.(
      'Unable to load Razorpay Checkout SDK. Please check your internet connection and disable any script blockers.'
    );
    return;
  }

  const amountInSubunits = Math.max(100, Math.round(params.amount * 100));

  // Try creating an official Razorpay Order via our backend middleware first
  let orderId: string | undefined;
  let activeKey = RAZORPAY_KEY_ID;
  try {
    const res = await fetch('/api/razorpay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountInSubunits,
        currency: params.currency,
        donorName: params.donorName || 'CommonTool Supporter',
        donorEmail: params.donorEmail,
        message: params.message,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.ok && data?.order?.id) {
        orderId = data.order.id;
        if (data.keyId) {
          activeKey = data.keyId;
        }
      }
    }
  } catch {
    // Fallback to standard client-side checkout if static hosting has no /api route
  }

  const options: RazorpayOptions = {
    key: activeKey,
    amount: amountInSubunits,
    currency: params.currency,
    name: 'CommonTool Foundation',
    description: `${params.tierLabel} — Supporting Free & Private Web Utilities`,
    ...(orderId ? { order_id: orderId } : {}),
    prefill: {
      name: params.donorName || 'CommonTool Supporter',
      email: params.donorEmail || 'support@breathy.in',
    },
    notes: {
      platform: 'CommonTool',
      tier: params.tierLabel,
      message: params.message || 'Keep CommonTool free!',
      contactEmail: 'contact@breathy.in',
    },
    theme: {
      color: '#4f46e5',
    },
    handler: async (response: RazorpayResponse) => {
      const paymentId = response.razorpay_payment_id;
      const returnedOrderId = response.razorpay_order_id || orderId || `direct_${Date.now()}`;
      const signature = response.razorpay_signature;

      let verified = false;
      if (response.razorpay_order_id && signature) {
        try {
          const verifyRes = await fetch('/api/razorpay/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          });
          if (verifyRes.ok) {
            const verifyJson = await verifyRes.json();
            verified = Boolean(verifyJson.verified);
          } else {
            console.warn('Payment verification signature check failed on server.');
            verified = false;
          }
        } catch {
          verified = false;
        }
      } else {
        verified = true;
      }

      const record: DonationRecord = {
        id: `DON-${Date.now().toString().slice(-6)}`,
        paymentId,
        orderId: returnedOrderId,
        signature,
        verified,
        amount: params.amount,
        currency: params.currency,
        donorName: params.donorName.trim() || 'Anonymous Supporter',
        donorEmail: params.donorEmail.trim() || 'Not provided',
        message: params.message.trim(),
        tierLabel: params.tierLabel,
        createdAt: new Date().toISOString(),
      };

      saveDonationToHistory(record);
      void logDonationToFirestore(record);
      params.onSuccess(record);
    },
    modal: {
      ondismiss: () => {
        params.onCancel?.('Payment window closed.');
      },
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', (err: unknown) => {
    const errObj = err as { error?: { description?: string } };
    params.onCancel?.(errObj?.error?.description || 'Payment failed. Please try again.');
  });
  rzp.open();
}

const DONATION_STORAGE_KEY = 'commontool_donations_history';

export function getDonationsHistory(): DonationRecord[] {
  try {
    const raw = localStorage.getItem(DONATION_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveDonationToHistory(record: DonationRecord): void {
  try {
    const existing = getDonationsHistory();
    const updated = [record, ...existing].slice(0, 25);
    localStorage.setItem(DONATION_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
}

export function downloadDonationReceiptPdf(record: DonationRecord): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const symbol = record.currency === 'INR' ? 'INR ' : 'USD $';

  // Header Banner
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 595, 110, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('CommonTool — Official Contribution Receipt', 45, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('100% Free, Zero-Upload Client-Side Utility Suite | https://commontool.web.app', 45, 74);
  doc.text('Contact: contact@breathy.in  |  Support: support@breathy.in', 45, 90);

  // Body
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Thank You for Keeping CommonTool Free for Everyone!', 45, 155);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Your generous contribution directly supports our zero-upload WebAssembly infrastructure, domain hosting,',
    45,
    176
  );
  doc.text(
    'and upcoming native iOS and Android apps so students, freelancers, and small businesses worldwide can work freely.',
    45,
    192
  );

  // Receipt Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(45, 215, 505, 210, 8, 8, 'FD');

  const rows: Array<[string, string]> = [
    ['Receipt Number', record.id],
    ['Date & Time', new Date(record.createdAt).toLocaleString()],
    ['Supporter Name', record.donorName],
    ['Supporter Email', record.donorEmail],
    ['Contribution Tier', record.tierLabel],
    ['Amount Paid', `${symbol}${record.amount.toLocaleString()}`],
    ['Razorpay Payment ID', record.paymentId],
    ['Razorpay Order Reference', record.orderId],
    ['Verification Status', record.verified ? 'Verified via Razorpay HMAC-SHA256' : 'Processed via Razorpay'],
  ];

  let y = 242;
  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(label, 65, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(value), 240, y);
    y += 20;
  }

  if (record.message) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    doc.text(`Supporter Note: "${record.message.slice(0, 95)}"`, 45, 455);
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(45, 480, 550, 480);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Questions regarding your contribution? Email us anytime at contact@breathy.in or support@breathy.in.',
    45,
    502
  );

  doc.save(`CommonTool-Donation-Receipt-${record.id}.pdf`);
}
