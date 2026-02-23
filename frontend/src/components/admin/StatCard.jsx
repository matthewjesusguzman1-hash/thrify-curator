import { motion } from "framer-motion";

export default function StatCard({ icon: Icon, value, label, color = "cyan" }) {
  const colorClasses = {
    cyan: "from-[#00D4FF]/10 to-[#00D4FF]/5 text-[#00D4FF]",
    purple: "from-[#8B5CF6]/10 to-[#8B5CF6]/5 text-[#8B5CF6]",
    pink: "from-[#FF1493]/10 to-[#FF1493]/5 text-[#FF1493]",
    green: "from-green-500/10 to-green-500/5 text-green-500"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-6`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl bg-white/50 flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${colorClasses[color].split(' ')[2]}`} />
        </div>
        <div>
          <p className="text-3xl font-bold text-[#1A1A2E]">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}
