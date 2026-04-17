import { useState, useEffect, useRef } from "react";
import { ArrowRight, ScanFace } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

/* Save credentials to browser password manager (triggers Face ID save prompt) */
async function storeCredential(badge, pin) {
  if (!window.PasswordCredential) return;
  try {
    const cred = new window.PasswordCredential({
      id: badge,
      password: pin,
      name: `Badge #${badge}`,
    });
    await navigator.credentials.store(cred);
  } catch {}
}

/* Retrieve saved credentials (triggers Face ID / Touch ID) */
async function getSavedCredential() {
  if (!window.PasswordCredential) return null;
  try {
    const cred = await navigator.credentials.get({
      password: true,
      mediation: "optional",
    });
    if (cred && cred.id && cred.password) {
      return { badge: cred.id, pin: cred.password };
    }
  } catch {}
  return null;
}

export default function LoginPage({ onLogin }) {
  const [badge, setBadge] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState("badge"); // badge -> pin -> biometric
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [tryingBiometric, setTryingBiometric] = useState(true);
  const attempted = useRef(false);

  /* On mount: try auto-login with saved credentials */
  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    (async () => {
      if (!window.PasswordCredential) {
        setTryingBiometric(false);
        return;
      }
      setBiometricAvailable(true);
      try {
        const cred = await getSavedCredential();
        if (cred) {
          const res = await fetch(`${API}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ badge: cred.badge, pin: cred.pin }),
          });
          if (res.ok) {
            onLogin(cred.badge);
            return;
          }
        }
      } catch {}
      setTryingBiometric(false);
    })();
  }, [onLogin]);

  const loginWithCredentials = async (b, p) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ badge: b, pin: p }),
    });
    if (res.ok) {
      await storeCredential(b, p);
      onLogin(b);
      return true;
    }
    return false;
  };

  const checkBadge = async () => {
    const b = badge.trim();
    if (!b) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/check-badge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badge: b }),
      });
      const data = await res.json();
      setIsNew(!data.exists);
      setStep("pin");
    } catch {
      toast.error("Connection error");
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    const b = badge.trim();
    const p = pin.trim();
    if (!b || !p) return;
    if (p.length < 4) { setError("PIN must be at least 4 digits"); return; }
    setLoading(true);
    setError("");
    try {
      const endpoint = isNew ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badge: b, pin: p }),
      });
      if (res.ok) {
        await storeCredential(b, p);
        onLogin(b);
      } else {
        const err = await res.json();
        setError(err.detail || "Login failed");
      }
    } catch {
      setError("Connection error");
    }
    setLoading(false);
  };

  const retryBiometric = async () => {
    setLoading(true);
    try {
      const cred = await getSavedCredential();
      if (cred) {
        const success = await loginWithCredentials(cred.badge, cred.pin);
        if (success) return;
      }
      toast.error("No saved credentials found");
    } catch {
      toast.error("Biometric login failed");
    }
    setLoading(false);
  };

  /* Show loading state while attempting biometric */
  if (tryingBiometric) {
    return (
      <div className="min-h-screen bg-[#002855] flex items-center justify-center px-4" data-testid="login-page">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-3xl overflow-hidden mb-6">
            <img src="/app-icon-180.png" alt="Inspection Navigator" className="w-full h-full object-cover" />
          </div>
          <p className="text-sm text-[#8FAEC5] animate-pulse">Signing in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#002855] flex items-center justify-center px-4" data-testid="login-page">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-3xl overflow-hidden">
            <img src="/app-icon-180.png" alt="Inspection Navigator" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="bg-[#0F1D2F] rounded-2xl p-6 border border-white/10 space-y-4">
          {step === "badge" ? (
            <>
              {/* Face ID / biometric button if available */}
              {biometricAvailable && (
                <button
                  onClick={retryBiometric}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors mb-2"
                  data-testid="biometric-login-btn"
                >
                  <ScanFace className="w-5 h-5" />
                  <span className="text-sm font-medium">Sign in with Face ID</span>
                </button>
              )}

              {biometricAvailable && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">or enter badge</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
              )}

              <div>
                <label className="text-[11px] font-medium text-white/50 uppercase tracking-wider block mb-2">
                  Badge Number
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  onKeyDown={(e) => e.key === "Enter" && checkBadge()}
                  placeholder="Enter badge number..."
                  autoFocus={!biometricAvailable}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-center text-2xl font-bold tracking-[0.3em] placeholder:text-white/20 placeholder:text-base placeholder:tracking-normal focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none"
                  data-testid="badge-input"
                />
              </div>
              <Button
                onClick={checkBadge}
                disabled={!badge.trim() || loading}
                className="w-full bg-[#D4AF37] text-[#002855] hover:bg-[#c9a432] h-12 text-sm font-bold"
                data-testid="badge-continue-btn"
              >
                {loading ? "Checking..." : "Continue"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/40">Badge: <strong className="text-[#D4AF37]">{badge}</strong></span>
                <button onClick={() => { setStep("badge"); setPin(""); setError(""); }} className="text-[10px] text-white/30 hover:text-white/60">Change</button>
              </div>
              <div>
                <label className="text-[11px] font-medium text-white/50 uppercase tracking-wider block mb-2">
                  {isNew ? "Create Your PIN" : "Enter PIN"}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 8)); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder={isNew ? "Create a 4+ digit PIN" : "Enter your PIN"}
                  autoFocus
                  className={`w-full px-4 py-3 rounded-xl bg-white/5 border text-white text-center text-2xl font-bold tracking-[0.3em] placeholder:text-white/20 placeholder:text-base placeholder:tracking-normal focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none ${error ? "border-[#EF4444]" : "border-white/10"}`}
                  data-testid="pin-input"
                />
                {error && (
                  <p className="text-[11px] text-[#EF4444] mt-2 text-center font-medium" data-testid="pin-error">
                    {error}
                  </p>
                )}
                {isNew && !error && (
                  <p className="text-[10px] text-[#D4AF37]/60 mt-2 text-center">
                    First time? You're creating a new account.
                  </p>
                )}
              </div>
              <Button
                onClick={handleSubmit}
                disabled={pin.length < 4 || loading}
                className="w-full bg-[#D4AF37] text-[#002855] hover:bg-[#c9a432] h-12 text-sm font-bold"
                data-testid="login-submit-btn"
              >
                {loading ? "..." : isNew ? "Create Account & Sign In" : "Sign In"}
              </Button>
            </>
          )}
        </div>

        <p className="text-[10px] text-[#8FAEC5]/40 text-center mt-4">
          FMCSA Violations Database
        </p>
      </div>
    </div>
  );
}
