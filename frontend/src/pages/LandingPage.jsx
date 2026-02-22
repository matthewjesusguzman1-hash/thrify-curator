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
  QrCode,
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
    description: "Shop our eBay store"
  },
  { 
    name: "Poshmark", 
    icon: Tag, 
    url: "https://posh.mk/dZSDIxRJJ0b", 
    color: "#7F0353",
    description: "Follow us on Poshmark"
  },
  { 
    name: "Mercari", 
    icon: ShoppingBag, 
    url: "https://www.mercari.com/u/thriftycurator/?sv=0", 
    color: "#FF0211",
    description: "Shop on Mercari"
  },
  { 
    name: "Depop", 
    icon: Sparkles, 
    url: "https://www.depop.com/thriftycurator/?utm_source=generic&utm_content=shop&utm_campaign=SHARE_SHOP_OWN_WEB_LANDING_ON&utm_medium=share&utm_term=thriftycurator&_branch_referrer=H4sIAAAAAAAAA8soKSkottLXT0ktyC%2FQSywo0MvJzMvWT68MLzVzyTEJDUuyrytKTUstKsrMS49PKsovL04tsvXNT8rMSVU1MghOTEssygQA9xU5%2FUUAAAA%3D&_branch_match_id=1366085332868029851", 
    color: "#FF2300",
    description: "Find us on Depop"
  },
  { 
    name: "Facebook Marketplace", 
    icon: SiFacebook, 
    url: "https://www.facebook.com/marketplace/profile/517375094/?ref=permalink&mibextid=wwXIfr&rdid=zWeU8ozpYg7I0AC7&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1DeqtsKL85%2F%3Fmibextid%3DwwXIfr#", 
    color: "#1877F2",
    description: "Shop on Facebook Marketplace"
  },
];

// Form links
const formLinks = [
  { 
    name: "Job Application", 
    icon: Briefcase, 
    path: "/job-application",
    description: "Join our team"
  },
  { 
    name: "Consignment Inquiry", 
    icon: FileText, 
    path: "/consignment-inquiry",
    description: "Start consigning with us"
  },
  { 
    name: "Consignment Agreement", 
    icon: ClipboardCheck, 
    path: "/consignment-agreement",
    description: "Sign your agreement"
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
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
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="logo-container"
        data-testid="logo-container"
      >
        <img src={LOGO_URL} alt="Thrifty Curator Logo" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-center"
      >
        <h1 className="font-playfair text-3xl md:text-4xl font-bold text-[#333] mb-2" data-testid="main-title">
          Thrifty Curator
        </h1>
        <p className="text-[#666] font-lato">Curated resale finds</p>
      </motion.div>

      {/* Shop Our Stores */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="links-section"
      >
        <h2 className="section-title" data-testid="shop-section-title">Shop Our Stores</h2>
        {platforms.map((platform) => (
          <motion.a
            key={platform.name}
            variants={itemVariants}
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            className="link-card group"
            data-testid={`platform-link-${platform.name.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div className="flex items-center gap-4">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${platform.color}15` }}
              >
                <platform.icon 
                  className="w-5 h-5" 
                  style={{ color: platform.color }}
                />
              </div>
              <div className="text-left">
                <p className="font-semibold text-[#333] group-hover:text-[#5D4037] transition-colors">
                  {platform.name}
                </p>
                <p className="text-sm text-[#888]">{platform.description}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#ccc] group-hover:text-[#F8C8DC] group-hover:translate-x-1 transition-all" />
          </motion.a>
        ))}
      </motion.div>

      {/* Forms & Applications */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="links-section"
      >
        <h2 className="section-title" data-testid="forms-section-title">Forms & Applications</h2>
        {formLinks.map((link) => (
          <motion.div key={link.name} variants={itemVariants}>
            <Link
              to={link.path}
              className="link-card group"
              data-testid={`form-link-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#F8C8DC]/20 flex items-center justify-center">
                  <link.icon className="w-5 h-5 text-[#D48C9E]" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-[#333] group-hover:text-[#5D4037] transition-colors">
                    {link.name}
                  </p>
                  <p className="text-sm text-[#888]">{link.description}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#ccc] group-hover:text-[#F8C8DC] group-hover:translate-x-1 transition-all" />
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Connect */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="links-section"
      >
        <h2 className="section-title" data-testid="connect-section-title">Connect</h2>
        
        {/* TikTok Link */}
        <motion.a
          variants={itemVariants}
          href={TIKTOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="link-card group"
          data-testid="tiktok-link"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center">
              <SiTiktok className="w-5 h-5 text-black" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-[#333] group-hover:text-[#5D4037] transition-colors">
                TikTok
              </p>
              <p className="text-sm text-[#888]">Follow @thrifty_curator</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#ccc] group-hover:text-[#F8C8DC] group-hover:translate-x-1 transition-all" />
        </motion.a>

        {/* Email Link */}
        <motion.a
          variants={itemVariants}
          href="mailto:euni.deleon1@gmail.com"
          className="link-card group"
          data-testid="email-link"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#D48C9E]/15 flex items-center justify-center">
              <Mail className="w-5 h-5 text-[#D48C9E]" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-[#333] group-hover:text-[#5D4037] transition-colors">
                Message Me Directly
              </p>
              <p className="text-sm text-[#888]">Send us an email</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#ccc] group-hover:text-[#F8C8DC] group-hover:translate-x-1 transition-all" />
        </motion.a>
      </motion.div>

      {/* Employee Portal */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="links-section"
      >
        <h2 className="section-title" data-testid="employee-section-title">Employee</h2>
        
        <motion.div variants={itemVariants}>
          <Link
            to="/login"
            className="link-card group"
            data-testid="employee-login-link"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#C5A065]/15 flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#C5A065]" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-[#333] group-hover:text-[#5D4037] transition-colors">
                  Employee Portal
                </p>
                <p className="text-sm text-[#888]">Clock in & track hours</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#ccc] group-hover:text-[#F8C8DC] group-hover:translate-x-1 transition-all" />
          </Link>
        </motion.div>
      </motion.div>

      {/* Share & QR Code Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="flex flex-col items-center gap-4 mt-4"
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

        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-[#888]">Scan to visit</p>
          <div className="bg-white p-2 rounded-xl shadow-card" data-testid="qr-code">
            <img 
              src={QR_CODE_URL} 
              alt="QR Code to Thrifty Curator" 
              className="w-24 h-24"
            />
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="text-center text-sm text-[#999] mt-8 pb-4"
      >
        <p>&copy; {new Date().getFullYear()} Thrifty Curator. All rights reserved.</p>
      </motion.footer>
    </div>
  );
}
