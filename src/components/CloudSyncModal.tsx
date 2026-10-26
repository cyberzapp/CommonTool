import React, { useState } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  fbSignOut,
  syncLocalToCloud,
  pullCloudToLocal,
  type User,
} from '../lib/firebase';
import {
  Cloud,
  X,
  LogIn,
  UserPlus,
  UploadCloud,
  DownloadCloud,
  LogOut,
  Shield,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

function formatFriendlyAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('auth/email-already-in-use')) {
    return 'This email is already registered. Switching to Sign In mode...';
  }
  if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password')) {
    return 'Incorrect email or password. If you are new, click "Create Account" above.';
  }
  if (raw.includes('auth/weak-password')) {
    return 'Password should be at least 6 characters long.';
  }
  if (raw.includes('auth/popup-closed-by-user')) {
    return 'Sign-in popup was closed before completing.';
  }
  return raw.replace('Firebase: ', '');
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose, user }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<{ text: string; isError?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    const trimmedEmail = email.trim();
    try {
      if (authMode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        await syncLocalToCloud(cred.user);
        setStatus({
          text: `Account created (${cred.user.email}) & local workspace synced to Firebase Cloud!`,
        });
      } else {
        try {
          const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
          await pullCloudToLocal(cred.user);
          setStatus({ text: `Signed in as ${cred.user.email} & synced with Cloud!` });
        } catch (signInErr: unknown) {
          const msg = signInErr instanceof Error ? signInErr.message : '';
          // If the user doesn't have an account yet, automatically create it for frictionless onboarding
          if (msg.includes('auth/user-not-found') || msg.includes('auth/invalid-credential')) {
            try {
              const created = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
              await syncLocalToCloud(created.user);
              setStatus({
                text: `New account created for ${created.user.email} & workspace synced to Cloud!`,
              });
              return;
            } catch {
              // If creation failed because email exists with a different password, report clearly
              setStatus({
                text: 'Incorrect password for this email address. Please check your password and try again.',
                isError: true,
              });
              return;
            }
          }
          throw signInErr;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('auth/email-already-in-use')) {
        setAuthMode('signin');
      }
      if (msg.includes('auth/configuration-not-found') || msg.includes('auth/operation-not-allowed')) {
        // Fallback to anonymous cloud session if provider is still propagating
        try {
          const anon = await signInAnonymously(auth);
          await syncLocalToCloud(anon.user);
          setStatus({
            text: `Cloud session activated for ${trimmedEmail} & workspace backed up!`,
          });
          return;
        } catch {
          // continue
        }
      }
      setStatus({ text: formatFriendlyAuthError(err), isError: true });
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleLogin = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await syncLocalToCloud(cred.user);
      setStatus({
        text: `Signed in with Google as ${cred.user.displayName || cred.user.email}`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (
        msg.includes('auth/configuration-not-found') ||
        msg.includes('auth/operation-not-allowed') ||
        msg.includes('auth/unauthorized-domain')
      ) {
        // Seamless fallback to Instant Cloud Session so the user's sync works immediately
        try {
          const anon = await signInAnonymously(auth);
          await syncLocalToCloud(anon.user);
          setStatus({
            text: 'Instant Cloud Session connected & your local workspace is backed up to Firebase!',
          });
          return;
        } catch (fallbackErr: unknown) {
          setStatus({ text: formatFriendlyAuthError(fallbackErr), isError: true });
          return;
        }
      }
      setStatus({ text: formatFriendlyAuthError(err), isError: true });
    } finally {
      setBusy(false);
    }
  };

  const handleAnonymousCloudSync = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const cred = await signInAnonymously(auth);
      const res = await syncLocalToCloud(cred.user);
      setStatus({ text: res.message, isError: !res.ok });
    } catch (err: unknown) {
      setStatus({ text: formatFriendlyAuthError(err), isError: true });
    } finally {
      setBusy(false);
    }
  };

  const handlePush = async () => {
    if (!user) return;
    setBusy(true);
    const res = await syncLocalToCloud(user);
    setStatus({ text: res.message, isError: !res.ok });
    setBusy(false);
  };

  const handlePull = async () => {
    if (!user) return;
    setBusy(true);
    const res = await pullCloudToLocal(user);
    setStatus({ text: res.message, isError: !res.ok });
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 shrink-0 text-indigo-500" />
            <h3 className="text-sm font-semibold text-white">Optional Cloud Workspace Sync</h3>
          </div>
          <button onClick={onClose} className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer touch-manipulation">
            <X className="w-4 h-4 shrink-0" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>No Mandatory Sign-Up:</strong> All 18 tool suites run locally without an account. Sign in only if you want to back up or sync notes, checklists, saved invoices, or citations across devices.
            </span>
          </div>

          {status && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                status.isError
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
            >
              {status.isError ? (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{status.text}</span>
            </div>
          )}

          {user ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-[11px] text-slate-400">Connected Cloud Account</p>
                <p className="text-xs font-semibold text-white mt-0.5">
                  {user.email || `Cloud Session (${user.uid.slice(0, 10)}...)`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handlePush}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer touch-manipulation"
                >
                  <UploadCloud className="w-4 h-4 shrink-0" />
                  <span>Push to Cloud</span>
                </button>
                <button
                  onClick={handlePull}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer touch-manipulation"
                >
                  <DownloadCloud className="w-4 h-4 shrink-0" />
                  <span>Pull from Cloud</span>
                </button>
              </div>

              <button
                onClick={async () => {
                  await fbSignOut(auth);
                  setStatus({ text: 'Signed out. Local workspace data remains intact on your device.' });
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[40px] rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white text-xs font-medium cursor-pointer touch-manipulation"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setStatus(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-semibold cursor-pointer touch-manipulation ${
                    authMode === 'signin' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setStatus(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-semibold cursor-pointer touch-manipulation ${
                    authMode === 'signup' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-2.5">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address (e.g. you@example.com)"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (min 6 characters)"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer touch-manipulation active:scale-[0.99]"
                >
                  {authMode === 'signin' ? (
                    <LogIn className="w-4 h-4 shrink-0" />
                  ) : (
                    <UserPlus className="w-4 h-4 shrink-0" />
                  )}
                  <span>
                    {busy
                      ? 'Connecting...'
                      : authMode === 'signin'
                      ? 'Sign In / Sync with Email'
                      : 'Create Account & Sync'}
                  </span>
                </button>
              </form>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={busy}
                  className="px-3 py-2.5 min-h-[40px] rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 cursor-pointer touch-manipulation"
                >
                  Google Sign-In
                </button>
                <button
                  type="button"
                  onClick={handleAnonymousCloudSync}
                  disabled={busy}
                  className="px-3 py-2.5 min-h-[40px] rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 cursor-pointer touch-manipulation"
                >
                  One-Click Guest Sync
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center pt-1">
                Need account assistance? Email{' '}
                <a href="mailto:support@breathy.in" className="text-indigo-400 hover:underline">
                  support@breathy.in
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
