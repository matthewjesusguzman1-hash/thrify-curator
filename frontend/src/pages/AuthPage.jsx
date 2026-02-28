import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = process.env.REACT_APP_LOGO_URL;

// Admin codes - map to their respective admin emails
const ADMIN_CODES = {
  "4399": "matthewjesusguzman1@gmail.com",
  "0826": "euniceguzman@thriftycurator.com"
};

export default function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");
      
      if (token && userData) {
        try {
          // Verify token is still valid
          await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const user = JSON.parse(userData);
          if (user.role === "admin") {
            navigate("/admin");
          } else {
            navigate("/dashboard");
          }
          return;
        } catch (error) {
          // Token invalid, clear storage
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }
      setCheckingSession(false);
    };

    checkExistingSession();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if admin code is entered - convert to admin email
      const trimmedInput = email.trim();
      const isAdminCode = ADMIN_CODES[trimmedInput] !== undefined;
      const loginEmail = ADMIN_CODES[trimmedInput] || trimmedInput;
      
      // Build login payload - include admin_code if using code-based login
      const payload = { email: loginEmail };
      if (isAdminCode) {
        payload.admin_code = trimmedInput;
      }
      
      const response = await axios.post(`${API}/auth/login`, payload);
      const { access_token, user } = response.data;
      
      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));
      
      toast.success(`Welcome back, ${user.name}!`);
      
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking session
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)' }}>
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-[#00D4FF] border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-white/70">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen min-h-[100dvh] overflow-y-auto flex flex-col items-center justify-center p-4 pb-safe"
      style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)' }}
      data-testid="auth-page"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md my-auto"
      >
        <Link 
          to="/" 
          className="mb-6 inline-flex items-center gap-2 text-white/70 hover:text-[#00D4FF] transition-colors" 
          data-testid="back-link"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/10 shadow-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src={LOGO_URL} 
              alt="Thrifty Curator" 
              className="w-24 h-24 rounded-2xl shadow-lg shadow-[#FF1493]/20"
            />
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Employee Portal</h1>
            <p className="text-white/60">Clock in and track your hours</p>
          </div>

          <form onSubmit={handleLogin} data-testid="login-form">
            <div className="space-y-2">
              <Label className="text-white/80 text-sm">Email</Label>
              <Input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#00D4FF] focus:ring-[#00D4FF]/20"
                data-testid="login-email"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] hover:from-[#00A8CC] hover:to-[#0088AA] text-white font-semibold shadow-lg shadow-[#00D4FF]/30 transition-all flex items-center justify-center gap-2"
              data-testid="login-submit-btn"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-white/40 mt-6">
            Contact your administrator if you need access
          </p>
        </div>

        {/* Branding */}
        <p className="text-center text-white/30 text-xs mt-6">
          Thrifty Curator • Curated Resale Finds
        </p>
      </motion.div>
    </div>
  );
}
