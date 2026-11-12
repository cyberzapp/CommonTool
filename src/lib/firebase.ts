import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyDcGR3GFMsFLzvxv2YoJepy0H6AUUMHQwg",
  authDomain: "memory-2b328.firebaseapp.com",
  projectId: "memory-2b328",
  storageBucket: "memory-2b328.firebasestorage.app",
  messagingSenderId: "570254755150",
  appId: "1:570254755150:web:eebb960edfb4024c18ca1f"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  fbSignOut,
  onAuthStateChanged,
  type User,
};

export interface CloudWorkspaceData {
  scratchpadNotes?: unknown;
  checklistItems?: unknown;
  savedInvoices?: unknown;
  customTemplates?: unknown;
  savedCitations?: unknown;
  savedPalettes?: unknown;
  pomodoroSettings?: unknown;
  updatedAt?: unknown;
}

const LOCAL_KEYS = {
  scratchpadNotes: 'commontool_scratchpad_notes',
  checklistItems: 'commontool_checklist_items',
  savedInvoices: 'commontool_saved_invoices',
  customTemplates: 'commontool_custom_templates',
  savedCitations: 'commontool_saved_citations',
  savedPalettes: 'commontool_saved_palettes',
  pomodoroSettings: 'commontool_pomodoro_settings',
};

export async function syncLocalToCloud(user: User): Promise<{ ok: boolean; message: string }> {
  try {
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
      userEmail: user.email || 'anonymous',
    };

    for (const [field, storageKey] of Object.entries(LOCAL_KEYS)) {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        try {
          payload[field] = JSON.parse(raw);
        } catch {
          payload[field] = raw;
        }
      }
    }

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || 'CommonTool User',
      isAnonymous: user.isAnonymous,
      lastSyncedAt: serverTimestamp(),
    }, { merge: true });

    await setDoc(doc(db, 'users', user.uid, 'workspace', 'state'), payload, { merge: true });
    return { ok: true, message: 'Workspace state synced to Firebase Cloud!' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Cloud sync failed';
    return { ok: false, message: msg };
  }
}

export async function pullCloudToLocal(user: User): Promise<{ ok: boolean; message: string; restoredKeys: string[] }> {
  try {
    const snap = await getDoc(doc(db, 'users', user.uid, 'workspace', 'state'));
    if (!snap.exists()) {
      return { ok: true, message: 'No cloud backup found yet — local state preserved.', restoredKeys: [] };
    }
    const data = snap.data();
    const restoredKeys: string[] = [];

    for (const [field, storageKey] of Object.entries(LOCAL_KEYS)) {
      if (data[field] !== undefined) {
        localStorage.setItem(storageKey, JSON.stringify(data[field]));
        restoredKeys.push(field);
      }
    }
    window.dispatchEvent(new CustomEvent('commontool-cloud-pulled'));
    return {
      ok: true,
      message: `Restored ${restoredKeys.length} workspace modules from Cloud!`,
      restoredKeys,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to pull from cloud';
    return { ok: false, message: msg, restoredKeys: [] };
  }
}

export async function logSupportTicketToFirestore(ticket: {
  name: string;
  email: string;
  recipient: string;
  topic: string;
  message: string;
}): Promise<boolean> {
  try {
    await addDoc(collection(db, 'support_tickets'), {
      name: ticket.name.trim().slice(0, 120),
      email: ticket.email.trim().slice(0, 180),
      recipient: ticket.recipient,
      topic: ticket.topic,
      message: ticket.message.trim().slice(0, 5000),
      createdAt: serverTimestamp(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function logDonationToFirestore(donation: {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: 'INR' | 'USD';
  donorName: string;
  donorEmail: string;
  phoneNumber?: string;
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  newsletterOptIn?: boolean;
  device?: string;
  message: string;
  tierLabel: string;
  verified: boolean;
}): Promise<boolean> {
  try {
    const docData: Record<string, unknown> = {
      paymentId: donation.paymentId,
      orderId: donation.orderId,
      amount: donation.amount,
      currency: donation.currency,
      donorName: donation.donorName.slice(0, 120),
      donorEmail: donation.donorEmail.slice(0, 180),
      message: donation.message.slice(0, 500),
      tierLabel: donation.tierLabel,
      verified: donation.verified,
      createdAt: serverTimestamp(),
    };

    if (donation.phoneNumber) {
      docData.phoneNumber = donation.phoneNumber.slice(0, 30);
    }
    if (donation.billingAddress) {
      docData.billingAddress = donation.billingAddress;
    }
    if (typeof donation.newsletterOptIn === 'boolean') {
      docData.newsletterOptIn = donation.newsletterOptIn;
    }
    if (donation.device) {
      docData.device = donation.device.slice(0, 500);
    }

    await addDoc(collection(db, 'donations'), docData);

    // If opted into newsletter, also register subscriber
    if (donation.newsletterOptIn && donation.donorEmail) {
      void subscribeNewsletterToFirestore({
        email: donation.donorEmail,
        donorName: donation.donorName,
        phoneNumber: donation.phoneNumber,
        source: 'donation_opt_in',
        device: donation.device,
      });
    }

    return true;
  } catch {
    return false;
  }
}

export async function subscribeNewsletterToFirestore(params: {
  email: string;
  donorName?: string;
  phoneNumber?: string;
  source?: string;
  device?: string;
}): Promise<{ ok: boolean; message: string }> {
  const email = params.email.trim().toLowerCase();
  if (!email || !email.includes('@') || !email.includes('.')) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }

  // First try server endpoint for full IP capture
  try {
    const res = await fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        donorName: params.donorName,
        phoneNumber: params.phoneNumber,
        source: params.source || 'website',
        device: params.device || (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
      }),
    });
    if (res.ok) {
      return { ok: true, message: 'Subscribed to CommonTool updates successfully!' };
    }
  } catch {
    // Fallback to client-side Firestore addDoc
  }

  try {
    await addDoc(collection(db, 'newsletter_subscribers'), {
      email,
      donorName: params.donorName?.slice(0, 150) || '',
      phoneNumber: params.phoneNumber?.slice(0, 30) || '',
      source: params.source || 'website',
      device:
        params.device?.slice(0, 500) ||
        (typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : ''),
      status: 'active',
      subscribedAt: serverTimestamp(),
    });
    return { ok: true, message: 'Subscribed to CommonTool updates successfully!' };
  } catch (err: unknown) {
    console.warn('Newsletter subscription fallback error:', err);
    return { ok: true, message: 'Thank you for subscribing!' };
  }
}
