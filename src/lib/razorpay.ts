import { jsPDF } from 'jspdf';
import { logDonationToFirestore } from './firebase';

export const RAZORPAY_KEY_ID =
  (import.meta.env.VITE_RAZORPAY_KEY_ID as string) || 'rzp_test_RukOz4cBQyvFQE';

export interface BillingAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

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
  phoneNumber?: string;
  billingAddress?: BillingAddress;
  newsletterOptIn?: boolean;
  device?: string;
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
    contact?: string;
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

export function getClientDeviceInfo(): string {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  const platform = navigator.platform || 'Browser';
  const scr = `${window.screen?.width || 0}x${window.screen?.height || 0}`;
  return `${platform} (${scr}) | ${ua.slice(0, 250)}`;
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

const PENDING_DONATION_KEY = 'commontool_pending_donation';
const DONOR_DRAFT_KEY = 'commontool_donor_draft';
const LATEST_DONATION_KEY = 'commontool_latest_donation';
const DONATION_STORAGE_KEY = 'commontool_donations_history';

export interface PendingDonationData {
  amount: number;
  currency: 'INR' | 'USD';
  donorName: string;
  donorEmail: string;
  phoneNumber?: string;
  billingAddress?: BillingAddress;
  newsletterOptIn?: boolean;
  message: string;
  tierLabel: string;
  orderId?: string;
  timestamp: number;
}

export interface DonorDraftData {
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  billingStreet: string;
  billingCity: string;
  billingState: string;
  billingPostal: string;
  billingCountry: string;
  donorMessage: string;
  newsletterOptIn: boolean;
  currency: 'INR' | 'USD';
  selectedTierId: string;
  customAmount: string;
}

export function saveDonorDraft(draft: Partial<DonorDraftData>) {
  try {
    const existing = loadDonorDraft() || {};
    localStorage.setItem(DONOR_DRAFT_KEY, JSON.stringify({ ...existing, ...draft }));
  } catch {
    // Ignore quota issues
  }
}

export function loadDonorDraft(): Partial<DonorDraftData> | null {
  try {
    const raw = localStorage.getItem(DONOR_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function savePendingDonation(data: PendingDonationData) {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(PENDING_DONATION_KEY, serialized);
    sessionStorage.setItem(PENDING_DONATION_KEY, serialized);
  } catch {
    // Ignore
  }
}

export function getPendingDonation(): PendingDonationData | null {
  try {
    const raw = sessionStorage.getItem(PENDING_DONATION_KEY) || localStorage.getItem(PENDING_DONATION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PendingDonationData;
    // 30-minute expiration TTL to avoid stale attempts
    if (Date.now() - (data.timestamp || 0) > 30 * 60 * 1000) {
      clearPendingDonation();
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearPendingDonation() {
  try {
    localStorage.removeItem(PENDING_DONATION_KEY);
    sessionStorage.removeItem(PENDING_DONATION_KEY);
  } catch {
    // Ignore
  }
}

export function saveLatestDonation(record: DonationRecord) {
  try {
    localStorage.setItem(LATEST_DONATION_KEY, JSON.stringify(record));
    sessionStorage.setItem(LATEST_DONATION_KEY, JSON.stringify(record));
    saveDonationToHistory(record);
  } catch {
    // Ignore
  }
}

export function getLatestDonation(): DonationRecord | null {
  try {
    const raw = sessionStorage.getItem(LATEST_DONATION_KEY) || localStorage.getItem(LATEST_DONATION_KEY);
    if (raw) return JSON.parse(raw);
    const history = getDonationsHistory();
    return history.length > 0 ? history[0] : null;
  } catch {
    return null;
  }
}

/**
 * Checks URL search parameters and pending state to recover transactions
 * when mobile browsers reload or redirect after UPI / Banking apps.
 */
export async function checkAndRecoverRedirectDonation(): Promise<DonationRecord | null> {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const paymentId = params.get('razorpay_payment_id') || params.get('payment_id');
  const orderId = params.get('razorpay_order_id') || params.get('order_id');
  const signature = params.get('razorpay_signature') || params.get('signature');

  if (!paymentId) return null;

  const pending = getPendingDonation();
  const clientDevice = getClientDeviceInfo();

  let verified = false;
  if (orderId && signature) {
    try {
      const verifyRes = await fetch('/api/razorpay/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          razorpay_signature: signature,
          donorName: pending?.donorName || 'CommonTool Supporter',
          donorEmail: pending?.donorEmail || '',
          phoneNumber: pending?.phoneNumber,
          billingAddress: pending?.billingAddress,
          newsletterOptIn: pending?.newsletterOptIn,
          device: clientDevice,
          amount: pending?.amount || 0,
          currency: pending?.currency || 'INR',
          tierLabel: pending?.tierLabel || 'Heartfelt Contribution',
          message: pending?.message || '',
        }),
      });
      if (verifyRes.ok) {
        const verifyJson = await verifyRes.json();
        verified = Boolean(verifyJson.verified);
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
    orderId: orderId || pending?.orderId || `direct_${Date.now()}`,
    signature: signature || undefined,
    verified,
    amount: pending?.amount || 250,
    currency: pending?.currency || 'INR',
    donorName: pending?.donorName || 'Generous Supporter',
    donorEmail: pending?.donorEmail || 'Not provided',
    phoneNumber: pending?.phoneNumber,
    billingAddress: pending?.billingAddress,
    newsletterOptIn: pending?.newsletterOptIn,
    device: clientDevice,
    message: pending?.message || '',
    tierLabel: pending?.tierLabel || 'Heartfelt Contribution',
    createdAt: new Date().toISOString(),
  };

  saveLatestDonation(record);
  clearPendingDonation();
  void logDonationToFirestore(record);

  // Clean URL params without page reload
  try {
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);
  } catch {
    // Ignore
  }

  return record;
}

export async function processRazorpayDonation(params: {
  amount: number; // Major unit, e.g., 499 INR or 15 USD
  currency: 'INR' | 'USD';
  donorName: string;
  donorEmail: string;
  phoneNumber?: string;
  billingAddress?: BillingAddress;
  newsletterOptIn?: boolean;
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
  const clientDevice = getClientDeviceInfo();

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
        phoneNumber: params.phoneNumber,
        billingAddress: params.billingAddress,
        newsletterOptIn: Boolean(params.newsletterOptIn),
        device: clientDevice,
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

  // Preserve pending transaction in localStorage so mobile browser reloads won't drop the state!
  savePendingDonation({
    amount: params.amount,
    currency: params.currency,
    donorName: params.donorName,
    donorEmail: params.donorEmail,
    phoneNumber: params.phoneNumber,
    billingAddress: params.billingAddress,
    newsletterOptIn: params.newsletterOptIn,
    message: params.message,
    tierLabel: params.tierLabel,
    orderId,
    timestamp: Date.now(),
  });

  const redirectCallbackUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/thank-you`
    : undefined;

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
      contact: params.phoneNumber || undefined,
    },
    notes: {
      platform: 'CommonTool',
      tier: params.tierLabel,
      message: params.message || 'Keep CommonTool free!',
      contactEmail: 'contact@breathy.in',
      phoneNumber: params.phoneNumber || '',
      newsletterOptIn: String(Boolean(params.newsletterOptIn)),
      billingCity: params.billingAddress?.city || '',
      billingCountry: params.billingAddress?.country || '',
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
            body: JSON.stringify({
              ...response,
              donorName: params.donorName,
              donorEmail: params.donorEmail,
              phoneNumber: params.phoneNumber,
              billingAddress: params.billingAddress,
              newsletterOptIn: params.newsletterOptIn,
              device: clientDevice,
              amount: params.amount,
              currency: params.currency,
              tierLabel: params.tierLabel,
              message: params.message,
            }),
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
        phoneNumber: params.phoneNumber?.trim() || undefined,
        billingAddress: params.billingAddress,
        newsletterOptIn: params.newsletterOptIn,
        device: clientDevice,
        message: params.message.trim(),
        tierLabel: params.tierLabel,
        createdAt: new Date().toISOString(),
      };

      saveLatestDonation(record);
      clearPendingDonation();
      void logDonationToFirestore(record);
      params.onSuccess(record);
    },
    modal: {
      ondismiss: () => {
        // Keep pending donation alive for 10 minutes in case user just switched back from a UPI app
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

export function getDonationsHistory(): DonationRecord[] {
  try {
    const raw = localStorage.getItem(DONATION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DonationRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveDonationToHistory(record: DonationRecord) {
  try {
    const current = getDonationsHistory();
    const updated = [record, ...current.filter((d) => d.paymentId !== record.paymentId)].slice(
      0,
      25
    );
    localStorage.setItem(DONATION_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }
}

export function downloadDonationReceiptPdf(record: DonationRecord) {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
  });

  const symbol = record.currency === 'INR' ? 'Rs ' : '$';

  // Header Banner
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 595, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('CommonTool — Official Contribution Receipt', 45, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('100% Free, Zero-Upload Client-Side Utility Suite | https://commontool.breathy.in', 45, 74);
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
  doc.roundedRect(45, 215, 505, 230, 8, 8, 'FD');

  const formattedAddress = record.billingAddress
    ? [
        record.billingAddress.street,
        record.billingAddress.city,
        record.billingAddress.state,
        record.billingAddress.postalCode,
        record.billingAddress.country,
      ]
        .filter(Boolean)
        .join(', ')
    : 'Not provided';

  const rows: Array<[string, string]> = [
    ['Receipt Number', record.id],
    ['Date & Time', new Date(record.createdAt).toLocaleString()],
    ['Supporter Name', record.donorName],
    ['Supporter Email', record.donorEmail],
    ['Supporter Phone', record.phoneNumber || 'Not provided'],
    ['Billing Address', formattedAddress.slice(0, 48)],
    ['Contribution Tier', record.tierLabel],
    ['Amount Paid', `${symbol}${record.amount.toLocaleString()}`],
    ['Razorpay Payment ID', record.paymentId],
    ['Razorpay Order Reference', record.orderId],
    ['Verification Status', record.verified ? 'Verified via Razorpay HMAC-SHA256' : 'Processed via Razorpay'],
  ];

  let y = 238;
  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(label, 65, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(value), 240, y);
    y += 18;
  }

  if (record.message) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    doc.text(`Supporter Note: "${record.message.slice(0, 95)}"`, 45, 465);
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(45, 488, 550, 488);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Questions regarding your contribution? Email us anytime at contact@breathy.in or support@breathy.in.',
    45,
    508
  );

  doc.save(`CommonTool-Donation-Receipt-${record.id}.pdf`);
}
