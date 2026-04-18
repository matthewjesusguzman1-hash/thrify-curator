import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Shield, Users, Eye, EyeOff, Search, RotateCcw, X, RefreshCw, Upload } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { useAuth } from "../components/app/AuthContext";
import { UploadDialog } from "../components/app/UploadDialog";

const API = process.env.REACT_APP_BACKEND_URL;

export default function AdminPage() {
  const navigate = useNavigate();
  const { badge } = useAuth();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [showPins, setShowPins] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [resetBadge, setResetBadge] = useState(null);
  const [newPin, setNewPin] = useState("");
  const [resetting, setResetting] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const isAdmin = badge === "121";

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API}/api/admin/users?badge=${badge}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotal(data.total || 0);
      }
    } catch { toast.error("Failed to load users"); }
  };

  useEffect(() => { if (isAdmin) fetchUsers(); }, [isAdmin]);

  const handleResetPin = async (targetBadge) => {
    if (!newPin || newPin.length < 4) { toast.error("PIN must be at least 4 digits"); return; }
    setResetting(true);
    try {
      const res = await fetch(`${API}/api/admin/users/${targetBadge}/reset-pin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badge, new_pin: newPin }),
      });
      if (res.ok) {
        toast.success(`PIN reset for badge ${targetBadge}`);
        setResetBadge(null);
        setNewPin("");
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Reset failed");
      }
    } catch { toast.error("Connection error"); }
    setResetting(false);
  };

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    return users.filter(u => u.badge.includes(searchTerm.trim()));
  }, [users, searchTerm]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center px-4">
        <div className="text-center">
          <Shield className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
          <p className="text-sm text-[#64748B]">Admin access is restricted.</p>
          <Button onClick={() => navigate("/")} className="mt-4 bg-[#002855] text-white hover:bg-[#001a3a]">Back to Dashboard</Button>
        </div>
      </div>
    );
  }

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
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#002855]" />
              <h2 className="text-lg font-bold text-[#0F172A]">Registered Users</h2>
              <span className="text-xs bg-[#002855] text-white px-2 py-0.5 rounded-full font-bold">{total}</span>
              <button
                onClick={fetchUsers}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#002855] hover:bg-[#F1F5F9] transition-colors"
                title="Refresh"
                data-testid="admin-refresh-btn"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
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

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              type="text"
              inputMode="numeric"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.replace(/\D/g, ""))}
              placeholder="Search by badge number..."
              className="w-full pl-9 pr-9 py-2.5 text-sm rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] transition-all"
              data-testid="admin-search"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#334155]">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {filteredUsers.length === 0 ? (
            <p className="text-sm text-[#94A3B8] text-center py-8">
              {searchTerm ? `No users matching "${searchTerm}"` : "No users registered yet"}
            </p>
          ) : (
            <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Badge</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">PIN</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Registered</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.badge} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC]" data-testid={`admin-user-${u.badge}`}>
                      <td className="px-4 py-3 text-sm font-bold text-[#002855] tracking-wider">{u.badge}</td>
                      <td className="px-4 py-3 text-sm font-mono text-[#64748B]">
                        {resetBadge === u.badge ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={newPin}
                              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                              onKeyDown={(e) => e.key === "Enter" && handleResetPin(u.badge)}
                              placeholder="New PIN"
                              autoFocus
                              className="w-20 px-2 py-1 text-xs rounded border border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none text-center font-mono"
                              data-testid={`reset-pin-input-${u.badge}`}
                            />
                            <button
                              onClick={() => handleResetPin(u.badge)}
                              disabled={resetting || newPin.length < 4}
                              className="text-[10px] font-bold text-white bg-[#D4AF37] px-2 py-1 rounded hover:bg-[#c9a432] disabled:opacity-40"
                              data-testid={`reset-pin-save-${u.badge}`}
                            >
                              {resetting ? "..." : "Save"}
                            </button>
                            <button
                              onClick={() => { setResetBadge(null); setNewPin(""); }}
                              className="text-[#94A3B8] hover:text-[#334155] p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          showPins ? u.pin : "****"
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#94A3B8]">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        {resetBadge !== u.badge && (
                          <button
                            onClick={() => { setResetBadge(u.badge); setNewPin(""); }}
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-[#64748B] hover:text-[#002855] transition-colors px-2 py-1 rounded hover:bg-[#F1F5F9]"
                            data-testid={`reset-pin-btn-${u.badge}`}
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reset PIN
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[10px] text-[#94A3B8] text-center">
            Showing {filteredUsers.length} of {total} users
          </p>

          {/* Upload Violations Data */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm mt-6">
            <h3 className="text-sm font-bold text-[#0F172A] mb-2">Data Management</h3>
            <button
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-[#F8FAFC] border border-[#E2E8F0] transition-colors text-left"
              data-testid="admin-upload-btn"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#002855]/10 flex-shrink-0">
                <Upload className="w-4 h-4 text-[#002855]" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#0F172A]">Upload Violations Data</p>
                <p className="text-[10px] text-[#64748B]">Import Excel/CSV file</p>
              </div>
            </button>
          </div>

          <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onUploadSuccess={() => { setUploadOpen(false); toast.success("Data uploaded"); }} />
        </div>
      </main>
    </div>
  );
}
