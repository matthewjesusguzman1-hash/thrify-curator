import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Shield, Users, Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

export default function AdminPage() {
  const navigate = useNavigate();
  const [adminPin, setAdminPin] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPins, setShowPins] = useState(false);

  const handleLogin = async () => {
    if (!adminPin.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_pin: adminPin.trim() }),
      });
      if (res.ok) {
        setAuthenticated(true);
        fetchUsers();
      } else {
        toast.error("Invalid admin PIN");
      }
    } catch { toast.error("Connection error"); }
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API}/api/admin/users?admin_pin=${adminPin.trim()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotal(data.total || 0);
      }
    } catch { toast.error("Failed to load users"); }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5]" data-testid="admin-page">
      <header className="sticky top-0 z-50 bg-[#002855] border-b border-[#001a3a]">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-white hover:bg-white/10 h-8 px-2">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#D4AF37]" />
              <h1 className="text-sm sm:text-lg font-semibold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
                Admin Panel
              </h1>
            </div>
          </div>
        </div>
        <div className="h-[2px] bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/60 to-transparent" />
      </header>

      <main className="max-w-3xl mx-auto px-3 sm:px-6 py-6">
        {!authenticated ? (
          <div className="max-w-sm mx-auto">
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <h2 className="text-sm font-bold text-[#0F172A] mb-4">Admin Access</h2>
              <label className="text-[11px] font-medium text-[#64748B] uppercase tracking-wider block mb-2">Admin PIN</label>
              <input
                type="password"
                inputMode="numeric"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Enter admin PIN..."
                autoFocus
                className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0] text-center text-lg font-bold tracking-widest focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] outline-none"
                data-testid="admin-pin-input"
              />
              <Button
                onClick={handleLogin}
                disabled={!adminPin.trim() || loading}
                className="w-full mt-4 bg-[#002855] text-white hover:bg-[#001a3a] h-11"
                data-testid="admin-login-btn"
              >
                {loading ? "Verifying..." : "Access Admin Panel"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#002855]" />
                <h2 className="text-lg font-bold text-[#0F172A]">Registered Users</h2>
                <span className="text-xs bg-[#002855] text-white px-2 py-0.5 rounded-full font-bold">{total}</span>
              </div>
              <button
                onClick={() => setShowPins(!showPins)}
                className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#002855] transition-colors"
                data-testid="toggle-pins-btn"
              >
                {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPins ? "Hide PINs" : "Show PINs"}
              </button>
            </div>

            {users.length === 0 ? (
              <p className="text-sm text-[#94A3B8] text-center py-8">No users registered yet</p>
            ) : (
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Badge</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">PIN</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.badge} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC]" data-testid={`admin-user-${u.badge}`}>
                        <td className="px-4 py-3 text-sm font-bold text-[#002855] tracking-wider">{u.badge}</td>
                        <td className="px-4 py-3 text-sm font-mono text-[#64748B]">{showPins ? u.pin : "****"}</td>
                        <td className="px-4 py-3 text-xs text-[#94A3B8]">{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
