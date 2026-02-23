import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  SiEbay, 
  SiFacebook, 
  SiTiktok,
  SiPoshmark,
  SiMercari,
  SiDepop
} from "react-icons/si";
import { 
  Share2, 
  Briefcase, 
  FileText, 
  ClipboardCheck, 
  ChevronRight,
  Clock,
  Mail
} from "lucide-react";
import { toast } from "sonner";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_c38502d5-e3cd-4d12-bde1-7a8331411fc2/artifacts/calba8ly_IMG_0042.jpg";
const TIKTOK_URL = "https://www.tiktok.com/@thrifty_curator?_r=1&_t=ZP-93ukKuigAtq";
const APP_URL = typeof window !== 'undefined' ? window.location.origin : '';
const QR_CODE_URL = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(APP_URL)}`;

// Platform data with brand icons
const platforms = [
  { name: "eBay", icon: SiEbay, url: "https://www.ebay.com/str/thriftycurator", color: "#E53238", iconColor: "#FFFFFF" },
  { name: "Poshmark", icon: SiPoshmark, url: "https://posh.mk/dZSDIxRJJ0b", color: "#7F0353", iconColor: "#FFFFFF" },
  { name: "Mercari", icon: SiMercari, url: "https://www.mercari.com/u/thriftycurator/?sv=0", color: "#4DC3FF", iconColor: "#FFFFFF" },
  { name: "Depop", icon: SiDepop, url: "https://www.depop.com/thriftycurator/", color: "#FF2300", iconColor: "#FFFFFF" },
  { name: "Facebook", icon: SiFacebook, url: "https://www.facebook.com/marketplace/profile/517375094/", color: "#1877F2", iconColor: "#FFFFFF" },
];

// Form links
const formLinks = [
  { name: "Job Application", icon: Briefcase, path: "/job-application", accent: "cyan" },
  { name: "Consignment Inquiry", icon: FileText, path: "/consignment-inquiry", accent: "pink" },
  { name: "Consignment Agreement", icon: ClipboardCheck, path: "/consignment-agreement", accent: "purple" },
];

// Connect links
const connectLinks = [
  { name: "TikTok", icon: SiTiktok, url: TIKTOK_URL, color: "#00D4FF" },
  { name: "Facebook", icon: SiFacebook, url: "https://www.facebook.com/people/Thrifty-Curator/100070158913020/", color: "#8B5CF6" },
  { name: "Message Me", icon: Mail, url: "mailto:euni.deleon1@gmail.com", color: "#FF1493" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export default function LandingPage() {
  const [shareLoading, setShareLoading] = useState(false);

  const handleShare = async () => {
    setShareLoading(true);
    const shareData = {
      title: "Thrifty Curator",
      text: "Check out Thrifty Curator - Curated resale finds!",
      url: window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success("Thanks for sharing!");
      } else {
        await navigator.clipboard.writeText(window.location.origin);
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
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header with Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-4 mb-10"
        >
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
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Shop Our Stores */}
            <div className="bg-white rounded-xl overflow-hidden shadow-xl">
              <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] to-[#00A8CC]" />
              <div className="p-5">
                <h2 className="font-poppins font-bold text-lg text-[#1A1A2E] mb-4" data-testid="shop-section-title">
                  Shop Our Stores
                </h2>
                <div className="space-y-3">
                  {platforms.map((platform, index) => (
                    <motion.a
                      key={platform.name}
                      variants={itemVariants}
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gradient-to-r hover:from-[#00D4FF]/10 hover:to-[#8B5CF6]/10 transition-all duration-300 group"
                      data-testid={`platform-link-${platform.name.toLowerCase()}`}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: platform.color }}
                        >
                          <platform.icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-semibold text-[#1A1A2E] group-hover:text-[#00D4FF] transition-colors">
                          {platform.name}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#00D4FF] group-hover:translate-x-1 transition-all" />
                    </motion.a>
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
                    <motion.a
                      key={link.name}
                      variants={itemVariants}
                      href={link.url}
                      target={link.url.startsWith('mailto') ? undefined : "_blank"}
                      rel={link.url.startsWith('mailto') ? undefined : "noopener noreferrer"}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gradient-to-r hover:from-[#FF1493]/10 hover:to-[#8B5CF6]/10 transition-all duration-300 group"
                      data-testid={`connect-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: link.color }}
                        >
                          <link.icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-semibold text-[#1A1A2E] group-hover:text-[#FF1493] transition-colors">
                          {link.name}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#FF1493] group-hover:translate-x-1 transition-all" />
                    </motion.a>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Forms & Applications */}
            <div className="bg-white rounded-xl overflow-hidden shadow-xl">
              <div className="h-1.5 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9]" />
              <div className="p-5">
                <h2 className="font-poppins font-bold text-lg text-[#1A1A2E] mb-4" data-testid="forms-section-title">
                  Forms & Applications
                </h2>
                <div className="space-y-3">
                  {formLinks.map((link) => (
                    <motion.div key={link.name} variants={itemVariants}>
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
                    </motion.div>
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
                <motion.div variants={itemVariants}>
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
                </motion.div>
              </div>
            </div>

            {/* QR Code & Share Section */}
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-xl overflow-hidden shadow-xl"
            >
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
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
