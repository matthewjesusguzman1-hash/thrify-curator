import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, LogIn, Fingerprint, Eye, EyeOff, Lock, HelpCircle, Mail, X, AlertCircle } from "lucide-react";
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
  const [showPasswordField, setShowPasswordField] = useState(false);  // For employee password
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loginMode, setLoginMode] = useState("normal"); // "normal", "password"
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  
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
      } else if (showPasswordField && password) {
        // Employee login with password
        payload = { 
          email: trimmedInput,
          password: password 
        };
      } else {
        // Check if employee has a password set first
        try {
          const checkRes = await axios.get(`${API}/auth/employee/has-password/${encodeURIComponent(trimmedInput)}`);
          
          if (checkRes.data.is_admin) {
            // Admin user - need admin code
            setShowAdminCode(true);
            setShowPasswordField(false);
            toast.info("Admin login requires access code");
            setLoading(false);
            return;
          }
          
          if (checkRes.data.has_password) {
            // Employee has password - show password field
            setShowPasswordField(true);
            setShowAdminCode(false);
            toast.info("Enter your password to continue");
            setLoading(false);
            return;
          }
        } catch (checkError) {
          // Continue with email-only login if check fails
        }
        
        // Employee login without password (no password set)
        payload = { email: trimmedInput };
      }
      
      const response = await axios.post(`${API}/auth/login`, payload);
      const { access_token, user } = response.data;
      
      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("sessionStart", Date.now().toString());
      
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
            setShowPasswordField(false);
            errorMessage = "Please enter your admin access code";
          }
          // If password required, show password field
          if (detail.includes("Password required")) {
            setShowPasswordField(true);
            setShowAdminCode(false);
            errorMessage = "Please enter your password";
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
                  // Reset fields if email changes
                  if (showAdminCode) {
                    setShowAdminCode(false);
                    setAdminCode("");
                  }
                  if (showPasswordField) {
                    setShowPasswordField(false);
                    setPassword("");
                  }
                }}
                required
                placeholder="your@email.com"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#00D4FF] focus:ring-[#00D4FF]/20"
                data-testid="login-email"
              />
            </div>

            {/* Employee Password field - shown when employee has password set */}
            {showPasswordField && (
              <div className="space-y-2 mt-4">
                <Label className="text-white/80 text-sm">Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#00D4FF] focus:ring-[#00D4FF]/20 pr-10"
                    data-testid="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

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
              disabled={loading || (showAdminCode && adminCode.length !== 4) || (showPasswordField && !password)}
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
                  {showPasswordField || showAdminCode ? "Sign In" : "Continue"}
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

          {/* Forgot Password Link */}
          {showPasswordField && (
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(true);
                setForgotEmail(email);
              }}
              className="w-full mt-3 text-center text-sm text-[#00D4FF] hover:text-[#00D4FF]/80 transition-colors flex items-center justify-center gap-2"
              data-testid="forgot-password-link"
            >
              <HelpCircle className="w-4 h-4" />
              Forgot your password?
            </button>
          )}

          <p className="text-center text-sm text-white/40 mt-6">
            Contact your administrator if you need access
          </p>
        </div>

        {/* Branding */}
        <p className="text-center text-white/30 text-xs mt-6">
          Thrifty Curator • Curated Resale Finds
        </p>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => { setShowForgotPassword(false); setResetMessage(""); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1A1A2E] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
              data-testid="forgot-password-modal"
            >
              <div className="h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                      <HelpCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Can't Access Your Account?</h2>
                      <p className="text-sm text-white/50">Here's how to get help</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowForgotPassword(false); setResetMessage(""); }}
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Instructions */}
                <div className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-amber-200 font-medium">
                          Password Reset Requires Admin Help
                        </p>
                        <p className="text-xs text-amber-200/70 mt-1">
                          For security, passwords can only be reset by an administrator.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-white font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#00D4FF]" />
                      How to Reset Your Password
                    </h3>
                    <ol className="text-sm text-white/70 space-y-2 list-decimal list-inside">
                      <li>Send a message using the button below</li>
                      <li>Include your email: <span className="text-[#00D4FF]">{forgotEmail || "your email"}</span></li>
                      <li>Your manager will reset your password</li>
                      <li>You'll receive a new temporary password</li>
                      <li>After logging in, change it from Security settings</li>
                    </ol>
                  </div>

                  {/* Message Input */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-white/70">Your Message (Optional)</Label>
                    <textarea
                      value={resetMessage}
                      onChange={(e) => setResetMessage(e.target.value)}
                      placeholder="Add any additional information..."
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 resize-none focus:outline-none focus:border-[#00D4FF]"
                      rows={3}
                      data-testid="reset-message-input"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="ghost"
                    onClick={() => { setShowForgotPassword(false); setResetMessage(""); }}
                    className="flex-1 text-white/70 hover:text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      const subject = encodeURIComponent("Password Reset Request - Employee Portal");
                      const body = encodeURIComponent(
                        `Hello,\n\nI need help resetting my password for the Employee Portal.\n\nMy email: ${forgotEmail || "[Please enter your email]"}\n\n${resetMessage ? `Additional info: ${resetMessage}\n\n` : ""}Thank you!`
                      );
                      window.open(`mailto:thriftycurator1@gmail.com?subject=${subject}&body=${body}`, '_blank');
                      toast.success("Opening email app...");
                      setShowForgotPassword(false);
                      setResetMessage("");
                    }}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                    data-testid="send-reset-request-btn"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                </div>

                {/* Direct Contact Info */}
                <div className="mt-4 p-3 bg-white/5 rounded-xl">
                  <p className="text-xs text-white/50 text-center">
                    Or contact us at <a href="mailto:thriftycurator1@gmail.com" className="text-[#00D4FF] hover:underline">thriftycurator1@gmail.com</a>
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
