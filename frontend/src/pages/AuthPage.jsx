import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, LogIn, Fingerprint, Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";
import useBiometricAuth from "@/hooks/useBiometricAuth";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = process.env.REACT_APP_LOGO_URL;

// Business owner codes - these map directly to their emails
const OWNER_CODES = {
  "4399": "matthewjesusguzman1@gmail.com",
  "0826": "euniceguzman@thriftycurator.com"
};

export default function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loginMode, setLoginMode] = useState("normal"); // "normal", "password"
  
  // Biometric auth hook
  const { isNative, isAvailable: biometricAvailable, biometricLogin, setCredentials } = useBiometricAuth();

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
      
      // Try biometric login if available and no session
      if (biometricAvailable && isNative) {
        const bioResult = await biometricLogin('employee_portal', {
          reason: 'Login to Employee Portal',
          title: 'Employee Login',
        });
        
        if (bioResult.success && bioResult.credentials) {
          try {
            const response = await axios.post(`${API}/auth/login`, {
              email: bioResult.credentials.username,
              password: bioResult.credentials.password
            });
            
            const { access_token, user } = response.data;
            localStorage.setItem("token", access_token);
            localStorage.setItem("user", JSON.stringify(user));
            
            toast.success(`Welcome back, ${user.name}!`);
            
            if (user.role === "admin") {
              navigate("/admin");
            } else {
              navigate("/dashboard");
            }
            return;
          } catch (loginError) {
            // Biometric credentials invalid, continue to normal login
            console.log('Stored credentials invalid');
          }
        }
      }
      
      setCheckingSession(false);
    };

    checkExistingSession();
  }, [navigate, biometricAvailable, isNative, biometricLogin]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const trimmedInput = email.trim();
      
      // Check if it's a business owner code (4-digit code that maps to owner email)
      const isOwnerCode = OWNER_CODES[trimmedInput] !== undefined;
      
      let payload;
      
      if (isOwnerCode) {
        // Owner code login - use mapped email and code
        payload = { 
          email: OWNER_CODES[trimmedInput],
          admin_code: trimmedInput 
        };
      } else if (showAdminCode && adminCode) {
        // Admin login with email + code
        payload = { 
          email: trimmedInput,
          admin_code: adminCode 
        };
      } else {
        // Regular employee login (email only)
        payload = { email: trimmedInput };
      }
      
      const response = await axios.post(`${API}/auth/login`, payload);
      const { access_token, user } = response.data;
      
      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));
      
      // Save credentials for biometric login if available
      if (biometricAvailable && isNative && password) {
        await setCredentials('employee_portal', trimmedInput, password);
      }
      
      toast.success(`Welcome back, ${user.name}!`);
      
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      // Handle error - ensure we display a string, not an object
      let errorMessage = "Login failed";
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        // Check if detail is a string or object
        if (typeof detail === 'string') {
          errorMessage = detail;
          // If admin code required, show the admin code field
          if (detail.includes("access code")) {
            setShowAdminCode(true);
            errorMessage = "Please enter your admin access code";
          }
        } else if (Array.isArray(detail)) {
          // Pydantic validation errors come as array
          errorMessage = detail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
        } else if (typeof detail === 'object') {
          errorMessage = detail.msg || detail.message || JSON.stringify(detail);
        }
      }
      toast.error(errorMessage);
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
                onChange={(e) => {
                  setEmail(e.target.value);
                  // Reset admin code field if email changes
                  if (showAdminCode) {
                    setShowAdminCode(false);
                    setAdminCode("");
                  }
                }}
                required
                placeholder="your@email.com"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#00D4FF] focus:ring-[#00D4FF]/20"
                data-testid="login-email"
              />
            </div>

            {/* Admin Access Code field - shown when admin tries to login with email */}
            {showAdminCode && (
              <div className="space-y-2 mt-4">
                <Label className="text-white/80 text-sm">Admin Access Code</Label>
                <Input
                  type="text"
                  value={adminCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setAdminCode(value);
                  }}
                  required
                  maxLength={4}
                  placeholder="4-digit code"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#00D4FF] focus:ring-[#00D4FF]/20 font-mono text-lg tracking-widest text-center"
                  data-testid="login-admin-code"
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || (showAdminCode && adminCode.length !== 4)}
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
            
            {/* Face ID / Touch ID login button */}
            {biometricAvailable && isNative && (
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  const bioResult = await biometricLogin('employee_portal', {
                    reason: 'Login to Employee Portal',
                    title: 'Employee Login',
                  });
                  
                  if (bioResult.success && bioResult.credentials) {
                    try {
                      const response = await axios.post(`${API}/auth/login`, {
                        email: bioResult.credentials.username,
                        password: bioResult.credentials.password
                      });
                      
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
                      toast.error("Saved login is outdated. Please login with email.");
                    }
                  } else if (bioResult.needsPassword) {
                    toast.info("No saved login found. Please login with email first.");
                  }
                  setLoading(false);
                }}
                className="w-full mt-3 py-2 text-white/70 hover:text-white flex items-center justify-center gap-2 text-sm transition-colors"
              >
                <Fingerprint className="w-5 h-5" />
                Use Face ID / Touch ID
              </button>
            )}
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
