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
  ChevronRight,
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
    url: "https://www.depop.com/thriftycurator/?utm_source=generic&utm_content=shop&utm_campaign=SHARE_SHOP_OWN_WEB_LANDING_ON&utm_medium=share&utm_term=thriftycurator&_branch_referrer=H4sIAAAAAAAAA8soKSkottLXT0ktyC%2FQSywo0MvJzMvWT68MLzVzyTEJDUuyrytKTUstKsrMS49PKsovL04tsvXNT8rMSVU1MghOTEssygQA9xU5%2FUUAAAA%3D&_branch_match_id=1366085332868029851", 
    color: "#FF2300",
  },
  { 
    name: "Facebook", 
    icon: SiFacebook, 
    url: "https://www.facebook.com/marketplace/profile/517375094/?ref=permalink&mibextid=wwXIfr&rdid=zWeU8ozpYg7I0AC7&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1DeqtsKL85%2F%3Fmibextid%3DwwXIfr#", 
    color: "#1877F2",
  },
];

// Form links
const formLinks = [
  { name: "Job Application", icon: Briefcase, path: "/job-application" },
  { name: "Consignment Inquiry", icon: FileText, path: "/consignment-inquiry" },
  { name: "Consignment Agreement", icon: ClipboardCheck, path: "/consignment-agreement" },
];

// Connect links
const connectLinks = [
  { name: "TikTok", icon: SiTiktok, url: TIKTOK_URL, color: "#000000" },
  { name: "Facebook", icon: SiFacebook, url: "https://www.facebook.com/people/Thrifty-Curator/100070158913020/", color: "#1877F2" },
  { name: "Message Me", icon: Mail, url: "mailto:euni.deleon1@gmail.com", color: "#D48C9E" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
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
    <div className="landing-container" data-testid="landing-page">
      {/* Header with Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-3"
      >
        <div className="logo-container" data-testid="logo-container">
          <img src={LOGO_URL} alt="Thrifty Curator Logo" />
        </div>
        <div className="text-center">
          <h1 className="font-playfair text-2xl md:text-3xl font-bold text-[#333]" data-testid="main-title">
            Thrifty Curator
          </h1>
          <p className="text-sm text-[#666] font-lato">Curated resale finds</p>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {/* Shop Our Stores */}
          <div className="links-section">
            <h2 className="section-title" data-testid="shop-section-title">Shop Our Stores</h2>
            <div className="links-grid">
              {platforms.map((platform) => (
                <motion.a
                  key={platform.name}
                  variants={itemVariants}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-card group"
                  data-testid={`platform-link-${platform.name.toLowerCase()}`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${platform.color}15` }}
                    >
                      <platform.icon className="w-4 h-4" style={{ color: platform.color }} />
                    </div>
                    <p className="font-semibold text-[#333] group-hover:text-[#5D4037] transition-colors text-sm">
                      {platform.name}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#ccc] group-hover:text-[#F8C8DC] transition-all" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Connect */}
          <div className="links-section">
            <h2 className="section-title" data-testid="connect-section-title">Connect</h2>
            <div className="links-grid">
              {connectLinks.map((link) => (
                <motion.a
                  key={link.name}
                  variants={itemVariants}
                  href={link.url}
                  target={link.url.startsWith('mailto') ? undefined : "_blank"}
                  rel={link.url.startsWith('mailto') ? undefined : "noopener noreferrer"}
                  className="link-card group"
                  data-testid={`connect-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${link.color}15` }}
                    >
                      <link.icon className="w-4 h-4" style={{ color: link.color }} />
                    </div>
                    <p className="font-semibold text-[#333] group-hover:text-[#5D4037] transition-colors text-sm">
                      {link.name}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#ccc] group-hover:text-[#F8C8DC] transition-all" />
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
          className="space-y-4"
        >
          {/* Forms & Applications */}
          <div className="links-section">
            <h2 className="section-title" data-testid="forms-section-title">Forms & Applications</h2>
            <div className="links-grid">
              {formLinks.map((link) => (
                <motion.div key={link.name} variants={itemVariants}>
                  <Link
                    to={link.path}
                    className="link-card group"
                    data-testid={`form-link-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#F8C8DC]/20 flex items-center justify-center">
                        <link.icon className="w-4 h-4 text-[#D48C9E]" />
                      </div>
                      <p className="font-semibold text-[#333] group-hover:text-[#5D4037] transition-colors text-sm">
                        {link.name}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#ccc] group-hover:text-[#F8C8DC] transition-all" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Employee Portal */}
          <div className="links-section">
            <h2 className="section-title" data-testid="employee-section-title">Employee</h2>
            <motion.div variants={itemVariants}>
              <Link
                to="/login"
                className="link-card group"
                data-testid="employee-login-link"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#C5A065]/15 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-[#C5A065]" />
                  </div>
                  <p className="font-semibold text-[#333] group-hover:text-[#5D4037] transition-colors text-sm">
                    Employee Portal
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#ccc] group-hover:text-[#F8C8DC] transition-all" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Share & QR Code Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="flex flex-col sm:flex-row items-center gap-6 mt-2"
      >
        <button
          onClick={handleShare}
          disabled={shareLoading}
          className="btn-primary flex items-center gap-2"
          data-testid="share-button"
        >
          <Share2 className="w-4 h-4" />
          {shareLoading ? "Sharing..." : "Share Thrifty Curator"}
        </button>

        <div className="flex items-center gap-3">
          <p className="text-xs text-[#888]">Scan to visit</p>
          <div className="bg-white p-1.5 rounded-lg shadow-card" data-testid="qr-code">
            <img 
              src={QR_CODE_URL} 
              alt="QR Code" 
              className="w-16 h-16"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
