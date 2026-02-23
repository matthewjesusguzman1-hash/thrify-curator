import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, LogIn, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_c38502d5-e3cd-4d12-bde1-7a8331411fc2/artifacts/calba8ly_IMG_0042.jpg";
const ADMIN_CODE = "4399";
const ADMIN_EMAIL = "matthewjesusguzman1@gmail.com";

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
      const response = await axios.post(`${API}/auth/login`, { email });
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
      <div className="auth-container">
        <div className="text-center">
          <p className="text-[#888]">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container" data-testid="auth-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="back-btn mb-6 inline-flex" data-testid="back-link">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="auth-card">
          <div className="text-center mb-6">
            <h1 className="auth-title">Employee Portal</h1>
            <p className="auth-subtitle">Clock in and track your hours</p>
          </div>

          <form onSubmit={handleLogin} data-testid="login-form">
            <div className="form-group">
              <Label className="form-label">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="form-input"
                data-testid="login-email"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
              data-testid="login-submit-btn"
            >
              {loading ? "Signing in..." : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </Button>

            <p 
              className="block text-center text-xs text-[#999] mt-3"
              data-testid="admin-portal-link"
            >
              Admin? Sign in with your admin email above
            </p>
          </form>

          <p className="text-center text-sm text-[#888] mt-6">
            Contact your administrator if you need access
          </p>
        </div>
      </motion.div>
    </div>
  );
}
