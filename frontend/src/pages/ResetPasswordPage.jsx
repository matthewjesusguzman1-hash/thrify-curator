import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = process.env.REACT_APP_LOGO_URL;

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState("");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await axios.get(`${API}/password-reset/validate/${token}`);
        if (response.data.valid) {
          setTokenValid(true);
          setEmail(response.data.email);
          setUserType(response.data.user_type);
        }
      } catch (error) {
        const message = error.response?.data?.detail || "Invalid or expired reset link";
        setTokenError(message);
        setTokenValid(false);
      } finally {
        setValidating(false);
      }
    };

    if (token) {
      validateToken();
    } else {
      setValidating(false);
      setTokenError("No reset token provided");
    }
  }, [token]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    // Validate password length
    if (password.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    
    setResetting(true);
    
    try {
      await axios.post(`${API}/password-reset/reset`, {
        token: token,
        new_password: password
      });
      
      setResetSuccess(true);
      toast.success("Password reset successfully!");
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to reset password";
      toast.error(message);
    } finally {
      setResetting(false);
    }
  };

  // Loading state
  if (validating) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)' }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-8 h-8 text-[#00D4FF] animate-spin mx-auto mb-4" />
          <p className="text-white/70">Validating reset link...</p>
        </motion.div>
      </div>
    );
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)' }}
        data-testid="reset-password-invalid"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/10 shadow-2xl">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-white text-center mb-2">Invalid Reset Link</h1>
            <p className="text-white/60 text-center mb-6">{tokenError}</p>
            
            <div className="space-y-3">
              <Link to="/login">
                <Button className="w-full bg-[#00D4FF] hover:bg-[#00A8CC] text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Employee Login
                </Button>
              </Link>
              <Link to="/consignment-agreement">
                <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                  Back to Consignment Portal
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (resetSuccess) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)' }}
        data-testid="reset-password-success"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/10 shadow-2xl">
            <div className="flex justify-center mb-6">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center"
              >
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </motion.div>
            </div>
            
            <h1 className="text-2xl font-bold text-white text-center mb-2">Password Reset!</h1>
            <p className="text-white/60 text-center mb-6">
              Your password has been successfully reset. You can now log in with your new password.
            </p>
            
            <div className="space-y-3">
              {userType === "employee" ? (
                <Link to="/login">
                  <Button className="w-full bg-[#00D4FF] hover:bg-[#00A8CC] text-white">
                    Go to Employee Login
                  </Button>
                </Link>
              ) : (
                <Link to="/consignment-agreement">
                  <Button className="w-full bg-[#00D4FF] hover:bg-[#00A8CC] text-white">
                    Go to Consignment Portal
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Reset form
  return (
    <div 
      className="min-h-screen min-h-[100dvh] overflow-y-auto flex flex-col items-center justify-center p-4 pb-safe"
      style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)' }}
      data-testid="reset-password-page"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md my-auto"
      >
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/10 shadow-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src={LOGO_URL} 
              alt="Thrifty Curator" 
              className="w-20 h-20 rounded-2xl shadow-lg shadow-[#FF1493]/20"
            />
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Reset Your Password</h1>
            <p className="text-white/60 text-sm">
              Enter a new password for <span className="text-[#00D4FF]">{email}</span>
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80 text-sm">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={4}
                  placeholder="Enter new password"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#00D4FF] focus:ring-[#00D4FF]/20 pl-10 pr-10"
                  data-testid="new-password-input"
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

            <div className="space-y-2">
              <Label className="text-white/80 text-sm">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={4}
                  placeholder="Confirm new password"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#00D4FF] focus:ring-[#00D4FF]/20 pl-10 pr-10"
                  data-testid="confirm-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password match indicator */}
            {password && confirmPassword && (
              <div className={`flex items-center gap-2 text-sm ${password === confirmPassword ? 'text-emerald-400' : 'text-amber-400'}`}>
                {password === confirmPassword ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Passwords match
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Passwords do not match
                  </>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={resetting || password.length < 4 || password !== confirmPassword}
              className="w-full mt-6 bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] hover:from-[#00A8CC] hover:to-[#0088AA] text-white font-semibold shadow-lg shadow-[#00D4FF]/30 transition-all"
              data-testid="reset-password-submit"
            >
              {resetting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-white/40 mt-6">
            Remember your password?{" "}
            <Link to="/login" className="text-[#00D4FF] hover:underline">
              Sign in
            </Link>
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
