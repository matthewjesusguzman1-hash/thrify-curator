import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  SiEbay, 
  SiFacebook, 
  SiTiktok,
  SiInstagram
} from "react-icons/si";
import { 
  Share2, 
  Briefcase, 
  FileText, 
  ClipboardCheck, 
  ChevronRight,
  Clock,
  MessageCircle,
  Send,
  X,
  User,
  Mail,
  CheckCircle,
  Smartphone,
  Download
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import axios from "axios";

// Import reCAPTCHA hook (will be undefined if provider not available)
let useGoogleReCaptcha;
try {
  useGoogleReCaptcha = require("react-google-recaptcha-v3").useGoogleReCaptcha;
} catch (e) {
  useGoogleReCaptcha = () => ({ executeRecaptcha: null });
}

const LOGO_URL = process.env.REACT_APP_LOGO_URL;
const TIKTOK_URL = process.env.REACT_APP_TIKTOK_URL;
const APP_URL = 'https://thrifty-curator.com';
const QR_CODE_URL = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(APP_URL)}`;

// Custom SVG Icons for platforms - stylized representations
const PoshmarkIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
    <path d="M7 6h5c2.2 0 4 1.8 4 4s-1.8 4-4 4H9v4H7V6zm2 6h3c1.1 0 2-.9 2-2s-.9-2-2-2H9v4z"/>
  </svg>
);

const MercariIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
    <path d="M3 6h3l3 12h2l3-12h3l3 12h2V6h2v14H3V6zm5.5 0l2.5 10 2.5-10h-5z"/>
  </svg>
);

const DepopIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
    <path d="M12 3c-5 0-9 4-9 9s4 9 9 9 9-4 9-9-4-9-9-9zm0 14c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5z"/>
  </svg>
);

// Platform data with brand logos
const platforms = [
  { 
    name: "eBay", 
    logoUrl: process.env.REACT_APP_EBAY_LOGO_URL,
    url: "https://www.ebay.com/str/thriftycurator", 
    color: "#FFFFFF",
    useImage: true
  },
  { 
    name: "Poshmark", 
    Icon: PoshmarkIcon,
    url: "https://posh.mk/dZSDIxRJJ0b", 
    color: "#7F0353"
  },
  { 
    name: "Mercari", 
    logoUrl: process.env.REACT_APP_MERCARI_LOGO_URL,
    url: "https://www.mercari.com/u/thriftycurator/?sv=0", 
    color: "#6B7AED",
    useImage: true
  },
  { 
    name: "Depop", 
    logoUrl: process.env.REACT_APP_DEPOP_LOGO_URL,
    url: "https://www.depop.com/thriftycurator/", 
    color: "#E60023",
    useImage: true
  },
  { 
    name: "Facebook Marketplace", 
    logoUrl: process.env.REACT_APP_FB_MARKETPLACE_LOGO_URL,
    url: "https://www.facebook.com/marketplace/profile/517375094/", 
    color: "#3b5998",
    useImage: true
  },
];

// Form links
const formLinks = [
  { name: "Job Application", icon: Briefcase, path: "/job-application", accent: "cyan" },
  { name: "Consignment Inquiry", icon: FileText, path: "/consignment-inquiry", accent: "pink" },
  { name: "Consignment Agreement", icon: ClipboardCheck, path: "/consignment-agreement", accent: "purple" },
];

// Connect links
const connectLinks = [
  { name: "TikTok", logoUrl: process.env.REACT_APP_TIKTOK_LOGO_URL, url: TIKTOK_URL, color: "#000000", useImage: true },
  { name: "Facebook", logoUrl: process.env.REACT_APP_FB_LOGO_URL, url: "https://www.facebook.com/people/Thrifty-Curator/100070158913020/", color: "#3b5998", useImage: true },
  { name: "Instagram", url: "https://www.instagram.com/thrifty_curator/", color: "#E1306C", isInstagram: true },
  { name: "Message Us", icon: MessageCircle, isMessaging: true, color: "#FF1493" },
];

const API = process.env.REACT_APP_BACKEND_URL;

// Check if running in Capacitor (mobile app)
const isCapacitor = typeof window !== 'undefined' && window.Capacitor !== undefined;

export default function LandingPage() {
  const [shareLoading, setShareLoading] = useState(false);
  
  // reCAPTCHA hook - only available on web when provider is present
  const { executeRecaptcha } = useGoogleReCaptcha ? useGoogleReCaptcha() : { executeRecaptcha: null };
  
  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  // PWA Install setup
  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt (Chrome, Edge, etc.)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        toast.success('App installed successfully!');
      }
      setDeferredPrompt(null);
    } else {
      // Fallback for browsers that don't support beforeinstallprompt
      toast.info('Use your browser menu to add this app to your home screen');
    }
  };

  // Messaging state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [messageForm, setMessageForm] = useState({
    name: "",
    email: "",
    message: "",
    website: ""  // Honeypot field - should stay empty
  });
  const [sendingMessage, setSendingMessage] = useState(false);

  const handleSendMessage = async () => {
    // Validate form
    if (!messageForm.name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!messageForm.email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(messageForm.email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!messageForm.message.trim()) {
      toast.error("Please enter a message");
      return;
    }
    
    setSendingMessage(true);
    try {
      // Get reCAPTCHA token if available (web only, not mobile)
      let recaptchaToken = null;
      if (executeRecaptcha && !isCapacitor) {
        try {
          recaptchaToken = await executeRecaptcha('contact_form_submit');
        } catch (recaptchaError) {
          console.warn("reCAPTCHA failed, proceeding without token:", recaptchaError);
        }
      }
      
      await axios.post(`${API}/api/messages`, {
        sender_name: messageForm.name.trim(),
        sender_email: messageForm.email.trim().toLowerCase(),
        message: messageForm.message.trim(),
        website: messageForm.website,  // Honeypot field
        recaptcha_token: recaptchaToken  // reCAPTCHA token (null for mobile)
      });
      
      setMessageSent(true);
      toast.success("Message sent successfully!");
    } catch (error) {
      console.error("Error sending message:", error);
      if (error.response?.status === 429) {
        toast.error("Too many messages. Please wait a few minutes before trying again.");
      } else if (error.response?.status === 400) {
        toast.error("Security verification failed. Please refresh and try again.");
      } else {
        toast.error("Failed to send message. Please try again.");
      }
    } finally {
      setSendingMessage(false);
    }
  };

  const handleOpenMessaging = () => {
    setShowMessageModal(true);
    setMessageSent(false);
    setMessageForm({ name: "", email: "", message: "", website: "" });
  };

  const handleCloseMessaging = () => {
    setShowMessageModal(false);
    setMessageSent(false);
    setMessageForm({ name: "", email: "", message: "", website: "" });
  };

  const handleShare = async () => {
    setShareLoading(true);
    const shareData = {
      title: "Thrifty Curator",
      text: "Check out Thrifty Curator - Curated resale finds!",
      url: APP_URL
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success("Thanks for sharing!");
      } else {
        await navigator.clipboard.writeText(APP_URL);
        toast.success("Link copied to clipboard!");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        toast.error("Failed to share");
      }
    } finally {
      setShareLoading(false);
    }
  };

  const getAccentGradient = (accent) => {
    switch(accent) {
      case 'cyan': return 'linear-gradient(90deg, #00D4FF 0%, #00A8CC 100%)';
      case 'pink': return 'linear-gradient(90deg, #FF1493 0%, #E91E8C 100%)';
      case 'purple': return 'linear-gradient(90deg, #8B5CF6 0%, #6D28D9 100%)';
      default: return 'linear-gradient(90deg, #00D4FF 0%, #8B5CF6 100%)';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460]" data-testid="landing-page">
      <div className="max-w-5xl mx-auto px-4 pt-16 pb-8 sm:pt-12">
        {/* Header with Logo */}
        <div className="flex flex-col items-center gap-4 mb-10">
          <div 
            className="w-28 h-28 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/20"
            data-testid="logo-container"
          >
            <img src={LOGO_URL} alt="Thrifty Curator Logo" className="w-full h-full object-cover" />
          </div>
          <div className="text-center">
            <h1 className="font-poppins text-3xl md:text-4xl font-bold text-white tracking-tight" data-testid="main-title">
              Thrifty Curator
            </h1>
            <p className="text-sm text-white/60 font-medium tracking-wider uppercase mt-1">
              Curated Resale Finds
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Shop Our Stores */}
            <div className="bg-white rounded-xl overflow-hidden shadow-xl">
              <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] to-[#00A8CC]" />
              <div className="p-5">
                <h2 className="font-poppins font-bold text-lg text-[#1A1A2E] mb-4" data-testid="shop-section-title">
                  Shop Our Stores
                </h2>
                <div className="space-y-3">
                  {platforms.map((platform, index) => (
                    <a
                      key={platform.name}
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gradient-to-r hover:from-[#00D4FF]/10 hover:to-[#8B5CF6]/10 transition-all duration-300 group"
                      data-testid={`platform-link-${platform.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white overflow-hidden"
                          style={{ backgroundColor: platform.color }}
                        >
                          {platform.useImage ? (
                            <img src={platform.logoUrl} alt={platform.name} className="w-full h-full object-cover" />
                          ) : (
                            <platform.Icon />
                          )}
                        </div>
                        <span className="font-semibold text-[#1A1A2E] group-hover:text-[#00D4FF] transition-colors">
                          {platform.name}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#00D4FF] group-hover:translate-x-1 transition-all" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Connect */}
            <div className="bg-white rounded-xl overflow-hidden shadow-xl">
              <div className="h-1.5 bg-gradient-to-r from-[#FF1493] to-[#E91E8C]" />
              <div className="p-5">
                <h2 className="font-poppins font-bold text-lg text-[#1A1A2E] mb-4" data-testid="connect-section-title">
                  Connect
                </h2>
                <div className="space-y-3">
                  {connectLinks.map((link) => (
                    link.isMessaging ? (
                      <button
                        key={link.name}
                        onClick={handleOpenMessaging}
                        className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gradient-to-r hover:from-[#FF1493]/10 hover:to-[#8B5CF6]/10 transition-all duration-300 group text-left"
                        data-testid={`connect-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden"
                            style={{ backgroundColor: link.color }}
                          >
                            <link.icon className="w-5 h-5 text-white" />
                          </div>
                          <span className="font-semibold text-[#1A1A2E] group-hover:text-[#FF1493] transition-colors">
                            {link.name}
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#FF1493] group-hover:translate-x-1 transition-all" />
                      </button>
                    ) : (
                      <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gradient-to-r hover:from-[#FF1493]/10 hover:to-[#8B5CF6]/10 transition-all duration-300 group"
                        data-testid={`connect-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden"
                            style={{ backgroundColor: link.color }}
                          >
                            {link.useImage ? (
                              <img src={link.logoUrl} alt={link.name} className="w-full h-full object-cover" />
                            ) : link.isInstagram ? (
                              <SiInstagram className="w-5 h-5 text-white" />
                            ) : (
                              <link.icon className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <span className="font-semibold text-[#1A1A2E] group-hover:text-[#FF1493] transition-colors">
                            {link.name}
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#FF1493] group-hover:translate-x-1 transition-all" />
                      </a>
                    )
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Forms & Applications */}
            <div className="bg-white rounded-xl overflow-hidden shadow-xl">
              <div className="h-1.5 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9]" />
              <div className="p-5">
                <h2 className="font-poppins font-bold text-lg text-[#1A1A2E] mb-4" data-testid="forms-section-title">
                  Forms & Applications
                </h2>
                <div className="space-y-3">
                  {formLinks.map((link) => (
                    <div key={link.name}>
                      <Link
                        to={link.path}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gradient-to-r hover:from-[#8B5CF6]/10 hover:to-[#00D4FF]/10 transition-all duration-300 group"
                        data-testid={`form-link-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ background: getAccentGradient(link.accent) }}
                          >
                            <link.icon className="w-5 h-5 text-white" />
                          </div>
                          <span className="font-semibold text-[#1A1A2E] group-hover:text-[#8B5CF6] transition-colors">
                            {link.name}
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#8B5CF6] group-hover:translate-x-1 transition-all" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Employee Portal */}
            <div className="bg-white rounded-xl overflow-hidden shadow-xl">
              <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#FF1493]" />
              <div className="p-5">
                <h2 className="font-poppins font-bold text-lg text-[#1A1A2E] mb-4" data-testid="employee-section-title">
                  Employee
                </h2>
                <div>
                  <Link
                    to="/login"
                    className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-[#1A1A2E] to-[#16213E] hover:from-[#16213E] hover:to-[#0F3460] transition-all duration-300 group"
                    data-testid="employee-login-link"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6]">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-semibold text-white">
                        Employee Portal
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-[#00D4FF] group-hover:translate-x-1 transition-all" />
                  </Link>
                </div>
              </div>
            </div>

            {/* QR Code & Share Section */}
            <div className="bg-white rounded-xl overflow-hidden shadow-xl">
              <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#FF1493]" />
              <div className="p-5">
                <div className="flex flex-col items-center gap-4">
                  {/* QR Code */}
                  <div className="flex flex-col items-center gap-2" data-testid="qr-code-section">
                    <div className="p-3 bg-white rounded-xl shadow-lg ring-2 ring-gray-100" data-testid="qr-code">
                      <img 
                        src={QR_CODE_URL} 
                        alt="QR Code" 
                        className="w-24 h-24"
                      />
                    </div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Scan to Visit</p>
                  </div>

                  {/* Share Button */}
                  <button
                    onClick={handleShare}
                    disabled={shareLoading}
                    className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white font-semibold hover:shadow-lg hover:shadow-[#00D4FF]/30 transition-all duration-300 flex items-center justify-center gap-2"
                    data-testid="share-button"
                  >
                    <Share2 className="w-4 h-4" />
                    {shareLoading ? "Sharing..." : "Share Thrifty Curator"}
                  </button>

                  {/* Add to Home Screen Button */}
                  {!isInstalled && (
                    <button
                      onClick={handleInstallClick}
                      className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-[#FF1493] to-[#E91E8C] text-white font-semibold hover:shadow-lg hover:shadow-[#FF1493]/30 transition-all duration-300 flex items-center justify-center gap-2"
                      data-testid="install-app-button"
                    >
                      <Smartphone className="w-4 h-4" />
                      Add to Home Screen
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message Us Modal */}
      <AnimatePresence>
        {showMessageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCloseMessaging}
            data-testid="message-modal-overlay"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-white/10"
              onClick={(e) => e.stopPropagation()}
              data-testid="message-modal"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-[#1A1A2E] to-[#16213E] p-5 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-[#FF1493] to-[#E91E8C] rounded-xl flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">Message Us</h3>
                      <p className="text-white/60 text-sm">We'd love to hear from you</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseMessaging}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    data-testid="close-message-modal"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {messageSent ? (
                  // Success State
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-6"
                  >
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <h4 className="font-bold text-xl text-white mb-2">Message Sent!</h4>
                    <p className="text-white/70 mb-6">
                      Thank you for reaching out. We'll review your message and reply to your email shortly.
                    </p>
                    <Button
                      onClick={handleCloseMessaging}
                      className="bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white hover:opacity-90"
                      data-testid="close-success-btn"
                    >
                      Close
                    </Button>
                  </motion.div>
                ) : (
                  // Form State
                  <div className="space-y-5">
                    {/* Info Banner */}
                    <div className="bg-[#00D4FF]/10 border border-[#00D4FF]/30 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-[#00D4FF] flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-white/80">
                          Please provide your email address so we can respond to you. All replies will be sent directly to your inbox.
                        </p>
                      </div>
                    </div>

                    {/* Name Input */}
                    <div className="space-y-2">
                      <Label htmlFor="sender-name" className="text-white/90 font-medium">
                        Your Name <span className="text-[#FF1493]">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                        <Input
                          id="sender-name"
                          type="text"
                          placeholder="Enter your name"
                          value={messageForm.name}
                          onChange={(e) => setMessageForm({ ...messageForm, name: e.target.value })}
                          className="pl-10 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#00D4FF] focus:ring-[#00D4FF]/20"
                          data-testid="message-name-input"
                        />
                      </div>
                    </div>

                    {/* Email Input */}
                    <div className="space-y-2">
                      <Label htmlFor="sender-email" className="text-white/90 font-medium">
                        Your Email <span className="text-[#FF1493]">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                        <Input
                          id="sender-email"
                          type="email"
                          placeholder="Enter your email address"
                          value={messageForm.email}
                          onChange={(e) => setMessageForm({ ...messageForm, email: e.target.value })}
                          className="pl-10 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#00D4FF] focus:ring-[#00D4FF]/20"
                          data-testid="message-email-input"
                        />
                      </div>
                    </div>

                    {/* Message Input */}
                    <div className="space-y-2">
                      <Label htmlFor="message-text" className="text-white/90 font-medium">
                        Your Message <span className="text-[#FF1493]">*</span>
                      </Label>
                      <Textarea
                        id="message-text"
                        placeholder="How can we help you?"
                        value={messageForm.message}
                        onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                        rows={4}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#00D4FF] focus:ring-[#00D4FF]/20 resize-none"
                        data-testid="message-text-input"
                      />
                    </div>

                    {/* Honeypot field - hidden from real users, bots will fill it */}
                    <div className="absolute -left-[9999px] opacity-0 pointer-events-none" aria-hidden="true">
                      <label htmlFor="website">Website</label>
                      <input
                        type="text"
                        id="website"
                        name="website"
                        autoComplete="off"
                        tabIndex={-1}
                        value={messageForm.website}
                        onChange={(e) => setMessageForm({ ...messageForm, website: e.target.value })}
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      onClick={handleSendMessage}
                      disabled={sendingMessage}
                      className="w-full h-12 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white font-semibold hover:opacity-90 transition-all"
                      data-testid="send-message-btn"
                    >
                      {sendingMessage ? (
                        <span className="flex items-center gap-2">
                          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Send className="w-4 h-4" />
                          Send Message
                        </span>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Install Instructions Modal */}
      <AnimatePresence>
        {showIOSModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowIOSModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#FF1493]" />
              
              <div className="p-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-8 h-8 text-white" />
                </div>
                
                <h2 className="text-xl font-bold text-center text-[#1A1A2E] mb-2">
                  Install on iPhone
                </h2>
                <p className="text-[#666] text-center text-sm mb-6">
                  Follow these steps to add Thrifty Curator to your home screen:
                </p>

                {/* Steps */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#007AFF] rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-[#1A1A2E]">Tap the Share button</p>
                      <p className="text-xs text-[#666]">
                        The square with an arrow pointing up at the bottom of Safari
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#007AFF] rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-[#1A1A2E]">Scroll down and tap</p>
                      <p className="text-xs text-[#666]">
                        "Add to Home Screen"
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#007AFF] rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-[#1A1A2E]">Tap "Add"</p>
                      <p className="text-xs text-[#666]">
                        In the top right corner
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setShowIOSModal(false)}
                  className="w-full mt-6 bg-gradient-to-r from-[#FF1493] to-[#E91E8C] hover:from-[#E91E8C] hover:to-[#C91E7C] text-white"
                >
                  Got it!
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
