import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, LogIn, Fingerprint, Eye, EyeOff, Lock, HelpCircle, Mail, X, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";
import useBiometricAuth from "@/hooks/useBiometricAuth";
import { useHaptics } from "@/hooks/useHaptics";
import { LiveActivityService } from "@/services/LiveActivityService";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = process.env.REACT_APP_LOGO_URL;
const APP_VERSION = "1.0.5"; // Keep in sync with App.js

// Log version on load for debugging
console.log(`[AuthPage] App Version: ${APP_VERSION} | Build: ${new Date().toISOString()}`);

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
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [biometricAttempted, setBiometricAttempted] = useState(false);
  
  // Biometric auth hook
  const { isNative, isAvailable: biometricAvailable, isLoading: biometricLoading, biometricLogin, setCredentials } = useBiometricAuth();
  
  // Haptic feedback
  const { buttonPress, heavyPress, lightTap, successFeedback, errorFeedback } = useHaptics();

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      // Wait for biometric check to complete
      if (biometricLoading) {
        return;
      }
      
      // Check if user just logged out - skip auto biometric login
      const justLoggedOut = sessionStorage.getItem("justLoggedOut");
      if (justLoggedOut) {
        sessionStorage.removeItem("justLoggedOut");
        setCheckingSession(false);
        return;
      }
      
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
      // Skip auto-scan - let user initiate Face ID to avoid double-scanning
      if (biometricAvailable && isNative) {
        console.log('Biometric available - user can tap Face ID button to login');
        // Don't auto-scan, just show the login page with Face ID button
      }
      
      setCheckingSession(false);
    };

    checkExistingSession();
  }, [navigate, biometricAvailable, biometricLoading, isNative, biometricLogin]);

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
      
      // Save credentials for biometric login if in native app
      // Determine which credential was used for login
      let credentialToSave = null;
      let emailToSave = trimmedInput;
      
      if (isOwnerCode) {
        // Owner code login - save the mapped email and the owner code
        credentialToSave = trimmedInput; // The 4-digit code they entered
        emailToSave = OWNER_CODES[trimmedInput]; // The mapped email
      } else if (showAdminCode && adminCode) {
        credentialToSave = adminCode;
      } else if (showPasswordField && password) {
        credentialToSave = password;
      } else {
        // Employee without password - save email as credential for Face ID
        // This allows passwordless employees to use biometric login
        credentialToSave = 'EMAIL_ONLY_LOGIN';
      }
      
      console.log('Checking biometric save conditions:', { 
        isNative, 
        hasCredential: !!credentialToSave, 
        isOwnerCode,
        showAdminCode,
        showPasswordField,
        hasPassword: !!password,
        hasAdminCode: !!adminCode
      });
      
      if (isNative && credentialToSave) {
        console.log('Saving credentials for biometric login...', { email: emailToSave });
        const saveResult = await setCredentials('employee_portal', emailToSave, credentialToSave);
        console.log('Credential save result:', saveResult);
        if (saveResult.success) {
          toast.success('Face ID enabled for future logins!', { duration: 2000 });
        }
      } else if (isNative && !credentialToSave) {
        console.log('No credential to save - employee without password');
      } else {
        console.log('Not in native app, skipping credential save');
      }
      
      heavyPress(); // Strong haptic for successful login
      successFeedback();
      toast.success(`Welcome back, ${user.name}!`);
      
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
      
      // Register device push token for admin notifications
      // This MUST run after login to associate token with user
      try {
        // Check for stored device token first (iOS caches this)
        const storedToken = localStorage.getItem('devicePushToken');
        const pendingToken = localStorage.getItem('pendingPushToken');
        let tokenToUse = pendingToken || storedToken;
        
        // If no stored token, try multiple methods to get it
        if (!tokenToUse) {
          console.log('No stored device push token, trying to get one...');
          
          // Method 1: Try LiveActivity plugin's getDevicePushToken (most reliable on iOS)
          try {
            const nativeToken = await LiveActivityService.getDevicePushToken();
            if (nativeToken) {
              console.log('Got device push token from LiveActivity plugin');
              tokenToUse = nativeToken;
              localStorage.setItem('devicePushToken', nativeToken);
            }
          } catch (nativeErr) {
            console.log('LiveActivity plugin token method not available:', nativeErr);
          }
          
          // Method 2: Try Capacitor PushNotifications plugin
          if (!tokenToUse) {
            try {
              const { PushNotifications } = await import('@capacitor/push-notifications');
              
              const permResult = await PushNotifications.checkPermissions();
              console.log('Push permission check:', permResult);
              
              if (permResult.receive === 'granted') {
                // Set up listener and register
                await PushNotifications.removeAllListeners();
                
                const tokenPromise = new Promise((resolve) => {
                  const timeout = setTimeout(() => {
                    console.log('Push token registration timed out');
                    resolve(null);
                  }, 5000);
                  
                  PushNotifications.addListener('registration', async (tokenData) => {
                    clearTimeout(timeout);
                    console.log('Device push token received from registration event:', tokenData.value);
                    localStorage.setItem('devicePushToken', tokenData.value);
                    resolve(tokenData.value);
                  });
                });
                
                await PushNotifications.register();
                tokenToUse = await tokenPromise;
              } else {
                // Request permissions
                const reqResult = await PushNotifications.requestPermissions();
                if (reqResult.receive === 'granted') {
                  await PushNotifications.register();
                }
              }
            } catch (capErr) {
              console.log('Capacitor push not available:', capErr.message);
            }
          }
        }
        
        // Now register the token with backend - use typed endpoint for proper targeting
        if (tokenToUse && user.id) {
          console.log('Registering device push token with backend...');
          const userType = user.is_admin ? 'admin' : 'employee';
          await axios.post(`${API}/live-activity/register-device-token-typed`, {
            user_id: user.id,
            device_token: tokenToUse,
            user_type: userType
          });
          localStorage.removeItem('pendingPushToken');
          console.log(`Device push token registered successfully for ${userType}:`, user.id);
        } else {
          console.log('No device push token available to register');
        }
      } catch (pushErr) {
        // Expected to fail on web - that's okay
        console.log('Push notification setup skipped:', pushErr.message);
      }
    } catch (error) {
      errorFeedback(); // Error haptic
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
          onClick={() => lightTap()}
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

          <form onSubmit={(e) => {
            buttonPress(); // Haptic on form submit
            handleLogin(e);
          }} data-testid="login-form">
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
            {isNative && (
              <button
                type="button"
                onClick={async () => {
                  buttonPress(); // Haptic on button press
                  console.log('Employee Face ID button clicked');
                  console.log('biometricAvailable:', biometricAvailable);
                  
                  if (!biometricAvailable) {
                    toast.error('Face ID/Touch ID is not available on this device');
                    return;
                  }
                  
                  setLoading(true);
                  const bioResult = await biometricLogin('employee_portal', {
                    reason: 'Login to Employee Portal',
                    title: 'Employee Login',
                  });
                  
                  console.log('Biometric result:', bioResult);
                  
                  if (bioResult.success && bioResult.credentials) {
                    try {
                      let response;
                      
                      // Handle passwordless employee login
                      if (bioResult.credentials.password === 'EMAIL_ONLY_LOGIN') {
                        response = await axios.post(`${API}/auth/login`, {
                          email: bioResult.credentials.username
                        });
                      } else {
                        // Try password login first
                        try {
                          response = await axios.post(`${API}/auth/login`, {
                            email: bioResult.credentials.username,
                            password: bioResult.credentials.password
                          });
                        } catch (pwdError) {
                          // If password login fails, try as admin code
                          console.log('Password login failed, trying admin code...');
                          response = await axios.post(`${API}/auth/login`, {
                            email: bioResult.credentials.username,
                            admin_code: bioResult.credentials.password
                          });
                        }
                      }
                      
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
                      console.log('Login error:', error);
                      toast.error("Saved login is outdated. Please login with email.");
                    }
                  } else if (bioResult.needsPassword) {
                    toast.info("No saved login found. Please login with email first.");
                  }
                  setLoading(false);
                }}
                className="w-full mt-3 py-2 text-white/70 hover:text-white flex items-center justify-center gap-2 text-sm transition-colors border border-white/20 rounded-lg hover:border-white/40"
              >
                <Fingerprint className="w-5 h-5" />
                Use Face ID / Touch ID
              </button>
            )}
          </form>

          {/* Forgot Password Link - Always visible */}
          <button
            type="button"
            onClick={() => {
              setShowForgotPassword(true);
              setForgotEmail(""); // Clear email so user enters it fresh
              setResetSent(false);
            }}
            className="w-full mt-3 text-center text-sm text-[#00D4FF] hover:text-[#00D4FF]/80 transition-colors flex items-center justify-center gap-2"
            data-testid="forgot-password-link"
          >
            <HelpCircle className="w-4 h-4" />
            Forgot your password?
          </button>

          <p className="text-center text-sm text-white/40 mt-6">
            Need more help logging in? Send a message from the homepage.
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
            onClick={() => { setShowForgotPassword(false); setResetSent(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1A1A2E] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
              data-testid="forgot-password-modal"
            >
              <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] to-[#00A8CC]" />
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] rounded-xl flex items-center justify-center">
                      <Lock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Reset Password</h2>
                      <p className="text-sm text-white/50">We'll send you a reset link</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowForgotPassword(false); setResetSent(false); }}
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                {resetSent ? (
                  // Success state
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Check Your Email</h3>
                    <p className="text-white/60 text-sm mb-4">
                      If an account exists for <span className="text-[#00D4FF]">{forgotEmail}</span>, you'll receive a password reset link shortly.
                    </p>
                    <p className="text-white/40 text-xs">
                      Don't see it? Check your spam folder.
                    </p>
                    <Button
                      onClick={() => { setShowForgotPassword(false); setResetSent(false); }}
                      className="mt-6 bg-white/10 hover:bg-white/20 text-white"
                    >
                      Close
                    </Button>
                  </div>
                ) : (
                  // Form state
                  <>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-white/70">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                          <Input
                            type="email"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            placeholder="Enter your email"
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#00D4FF] pl-10"
                            data-testid="forgot-email-input"
                          />
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-sm text-white/60">
                          Enter the email address associated with your employee account and we'll send you a link to reset your password.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <Button
                        variant="ghost"
                        onClick={() => { setShowForgotPassword(false); setResetSent(false); }}
                        className="flex-1 text-white/70 hover:text-white hover:bg-white/10"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          if (!forgotEmail) {
                            toast.error("Please enter your email address");
                            return;
                          }
                          setSendingReset(true);
                          try {
                            await axios.post(`${API}/password-reset/request`, {
                              email: forgotEmail,
                              user_type: "employee"
                            });
                            setResetSent(true);
                          } catch (error) {
                            // Handle rate limiting
                            if (error.response?.status === 429) {
                              toast.error("Too many requests", {
                                description: "Please wait a while before requesting another reset link."
                              });
                            } else {
                              // Still show success for security (don't reveal if email exists)
                              setResetSent(true);
                            }
                          } finally {
                            setSendingReset(false);
                          }
                        }}
                        disabled={sendingReset || !forgotEmail}
                        className="flex-1 bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] hover:from-[#00A8CC] hover:to-[#0088AA] text-white"
                        data-testid="send-reset-btn"
                      >
                        {sendingReset ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Reset Link
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
