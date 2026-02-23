import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  SiEbay, 
  SiFacebook, 
  SiTiktok 
} from "react-icons/si";
import { 
  Share2, 
  Briefcase, 
  FileText, 
  ClipboardCheck, 
  ArrowRight,
  Clock,
  ShoppingBag,
  Tag,
  Sparkles,
  Mail
} from "lucide-react";
import { toast } from "sonner";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_c38502d5-e3cd-4d12-bde1-7a8331411fc2/artifacts/calba8ly_IMG_0042.jpg";
const TIKTOK_URL = "https://www.tiktok.com/@thrifty_curator?_r=1&_t=ZP-93ukKuigAtq";
const APP_URL = typeof window !== 'undefined' ? window.location.origin : '';
const QR_CODE_URL = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(APP_URL)}`;

// Platform data
const platforms = [
  { 
    name: "eBay", 
    icon: SiEbay, 
    url: "https://www.ebay.com/str/thriftycurator?mkcid=16&mkevt=1&mkrid=711-127632-2357-0&ssspo=hl_ypeykrc2&sssrc=3418065&ssuid=hl_ypeykrc2&stype=1&widget_ver=artemis&media=COPY", 
    color: "#E53238",
  },
  { 
    name: "Poshmark", 
    icon: Tag, 
    url: "https://posh.mk/dZSDIxRJJ0b", 
    color: "#7F0353",
  },
  { 
    name: "Mercari", 
    icon: ShoppingBag, 
    url: "https://www.mercari.com/u/thriftycurator/?sv=0", 
    color: "#FF0211",
  },
  { 
    name: "Depop", 
    icon: Sparkles, 
    url: "https://www.depop.com/thriftycurator/?utm_source=generic&utm_content=shop&utm_campaign=SHARE_SHOP_OWN_WEB_LANDING_ON&utm_medium=share&utm_term=thriftycurator", 
    color: "#FF2300",
  },
  { 
    name: "Facebook", 
    icon: SiFacebook, 
    url: "https://www.facebook.com/marketplace/profile/517375094/", 
    color: "#1877F2",
  },
];

// Form links
const formLinks = [
  { name: "Job Application", icon: Briefcase, path: "/job-application", accent: "#FF5A5F" },
  { name: "Consignment Inquiry", icon: FileText, path: "/consignment-inquiry", accent: "#FACC15" },
  { name: "Consignment Agreement", icon: ClipboardCheck, path: "/consignment-agreement", accent: "#8B5CF6" },
];

// Connect links
const connectLinks = [
  { name: "TikTok", icon: SiTiktok, url: TIKTOK_URL, color: "#000000" },
  { name: "Facebook", icon: SiFacebook, url: "https://www.facebook.com/people/Thrifty-Curator/100070158913020/", color: "#1877F2" },
  { name: "Message Me", icon: Mail, url: "mailto:euni.deleon1@gmail.com", color: "#FF5A5F" },
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
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
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

  return (
    <div className="min-h-screen bg-white" data-testid="landing-page">
      {/* Bold Accent Bar */}
      <div className="accent-bar" />
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header with Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-4 mb-10"
        >
          <div 
            className="w-28 h-28 border-4 border-[#1A1A1A] overflow-hidden shadow-bold"
            data-testid="logo-container"
          >
            <img src={LOGO_URL} alt="Thrifty Curator Logo" className="w-full h-full object-cover" />
          </div>
          <div className="text-center">
            <h1 className="font-archivo text-3xl md:text-4xl text-[#1A1A1A] tracking-tight" data-testid="main-title">
              THRIFTY CURATOR
            </h1>
            <p className="text-sm text-[#666] font-manrope font-semibold tracking-widest uppercase mt-1">
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
            <div>
              <h2 
                className="font-archivo text-lg mb-4 pb-2 border-b-4 border-[#1A1A1A] inline-block"
                data-testid="shop-section-title"
              >
                SHOP OUR STORES
              </h2>
              <div className="space-y-3">
                {platforms.map((platform, index) => (
                  <motion.a
                    key={platform.name}
                    variants={itemVariants}
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white border-2 border-[#1A1A1A] p-4 shadow-bold-sm hover:shadow-bold hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-150"
                    data-testid={`platform-link-${platform.name.toLowerCase()}`}
                    style={{ transitionDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-10 h-10 flex items-center justify-center border-2 border-[#1A1A1A]"
                          style={{ backgroundColor: platform.color }}
                        >
                          <platform.icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-[#1A1A1A] uppercase tracking-wide">
                          {platform.name}
                        </span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-[#1A1A1A]" />
                    </div>
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Connect */}
            <div>
              <h2 
                className="font-archivo text-lg mb-4 pb-2 border-b-4 border-[#1A1A1A] inline-block"
                data-testid="connect-section-title"
              >
                CONNECT
              </h2>
              <div className="space-y-3">
                {connectLinks.map((link, index) => (
                  <motion.a
                    key={link.name}
                    variants={itemVariants}
                    href={link.url}
                    target={link.url.startsWith('mailto') ? undefined : "_blank"}
                    rel={link.url.startsWith('mailto') ? undefined : "noopener noreferrer"}
                    className="block bg-white border-2 border-[#1A1A1A] p-4 shadow-bold-sm hover:shadow-bold hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-150"
                    data-testid={`connect-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-10 h-10 flex items-center justify-center border-2 border-[#1A1A1A]"
                          style={{ backgroundColor: link.color }}
                        >
                          <link.icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-[#1A1A1A] uppercase tracking-wide">
                          {link.name}
                        </span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-[#1A1A1A]" />
                    </div>
                  </motion.a>
                ))}
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
            <div>
              <h2 
                className="font-archivo text-lg mb-4 pb-2 border-b-4 border-[#1A1A1A] inline-block"
                data-testid="forms-section-title"
              >
                FORMS & APPLICATIONS
              </h2>
              <div className="space-y-3">
                {formLinks.map((link, index) => (
                  <motion.div key={link.name} variants={itemVariants}>
                    <Link
                      to={link.path}
                      className="block bg-white border-2 border-[#1A1A1A] p-4 shadow-bold-sm hover:shadow-bold hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-150"
                      data-testid={`form-link-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-10 h-10 flex items-center justify-center border-2 border-[#1A1A1A]"
                            style={{ backgroundColor: link.accent }}
                          >
                            <link.icon className="w-5 h-5 text-white" />
                          </div>
                          <span className="font-bold text-[#1A1A1A] uppercase tracking-wide">
                            {link.name}
                          </span>
                        </div>
                        <ArrowRight className="w-5 h-5 text-[#1A1A1A]" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Employee Portal */}
            <div>
              <h2 
                className="font-archivo text-lg mb-4 pb-2 border-b-4 border-[#1A1A1A] inline-block"
                data-testid="employee-section-title"
              >
                EMPLOYEE
              </h2>
              <motion.div variants={itemVariants}>
                <Link
                  to="/login"
                  className="block bg-[#FACC15] border-2 border-[#1A1A1A] p-4 shadow-bold hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-bold-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-150"
                  data-testid="employee-login-link"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 flex items-center justify-center border-2 border-[#1A1A1A] bg-[#1A1A1A]">
                        <Clock className="w-5 h-5 text-[#FACC15]" />
                      </div>
                      <span className="font-archivo text-[#1A1A1A] uppercase tracking-wide">
                        Employee Portal
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#1A1A1A]" />
                  </div>
                </Link>
              </motion.div>
            </div>

            {/* QR Code & Share Section */}
            <motion.div
              variants={itemVariants}
              className="bg-[#1A1A1A] border-2 border-[#1A1A1A] p-6 shadow-bold-coral"
            >
              <div className="flex flex-col items-center gap-4">
                {/* QR Code */}
                <div className="flex flex-col items-center gap-2" data-testid="qr-code-section">
                  <div className="bg-white p-3 border-2 border-white" data-testid="qr-code">
                    <img 
                      src={QR_CODE_URL} 
                      alt="QR Code" 
                      className="w-24 h-24"
                    />
                  </div>
                  <p className="text-xs text-white/70 uppercase tracking-widest font-semibold">Scan to Visit</p>
                </div>

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  disabled={shareLoading}
                  className="w-full bg-[#FF5A5F] text-white border-2 border-white font-archivo uppercase tracking-wide py-3 px-6 hover:bg-[#E5484D] transition-colors flex items-center justify-center gap-2"
                  data-testid="share-button"
                >
                  <Share2 className="w-4 h-4" />
                  {shareLoading ? "SHARING..." : "SHARE"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
