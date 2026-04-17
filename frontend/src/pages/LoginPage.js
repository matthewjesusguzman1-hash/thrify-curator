import { useState } from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

export default function LoginPage({ onLogin }) {
  const [badge, setBadge] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState("badge"); // badge -> pin
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div className="min-h-screen bg-[#002855] flex items-center justify-center px-4" data-testid="login-page">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#D4AF37] mb-4">
            <ShieldCheck className="w-8 h-8 text-[#002855]" strokeWidth={2} />
          </div>
          <h1
            className="text-2xl font-bold text-white tracking-tight"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            SafeSpect
          </h1>
          <p className="text-sm text-[#8FAEC5] mt-1">Violation Navigator</p>
        </div>

        <div className="bg-[#0F1D2F] rounded-2xl p-6 border border-white/10 space-y-4">
          {step === "badge" ? (
            <>
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
                  autoFocus
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
          FMCSA Current Violations Database
        </p>
      </div>
    </div>
  );
}
