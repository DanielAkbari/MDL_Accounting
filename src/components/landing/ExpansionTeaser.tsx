import { motion } from "motion/react";
import { Coffee, Home, Sparkles } from "lucide-react";

interface ExpansionCard {
  icon: typeof Coffee;
  iconColor: string;
  title: string;
  desc: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

const cards: ExpansionCard[] = [
  {
    icon: Coffee,
    iconColor: "text-amber-400/60",
    title: "Fintrax Cafe & Retail",
    desc: "Manajemen operasional kafe & restoran terintegrasi. Dari pemesanan, stok bahan baku, hingga laporan penjualan harian.",
    badgeBg: "bg-amber-500/10",
    badgeBorder: "border-amber-500/20",
    badgeText: "text-amber-400/80",
  },
  {
    icon: Home,
    iconColor: "text-cyan-400/60",
    title: "Fintrax Service & Rent",
    desc: "Sistem pengelolaan sewa properti & aset digital. Tracking kontrak, pembayaran, dan maintenance dalam satu tempat.",
    badgeBg: "bg-cyan-500/10",
    badgeBorder: "border-cyan-500/20",
    badgeText: "text-cyan-400/80",
  },
];

const ExpansionTeaser = () => {
  return (
    <section
      className="relative py-24 sm:py-32"
      style={{ backgroundColor: "#060b18" }}
    >
      {/* Header */}
      <div className="max-w-2xl mx-auto text-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <h2 className="text-3xl sm:text-4xl font-bold font-['Space_Grotesk'] text-white">
              Segera Hadir di Ekosistem Fintrax
            </h2>
          </div>
          <p className="text-slate-400 mt-4">
            Kami sedang membangun ekosistem lengkap untuk berbagai jenis bisnis.
          </p>
        </motion.div>
      </div>

      {/* Cards */}
      <div className="max-w-4xl mx-auto mt-16 grid grid-cols-1 sm:grid-cols-2 gap-6 px-6">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.15 }}
            className="relative group rounded-2xl border border-dashed border-slate-700/50 bg-slate-800/20 backdrop-blur-sm p-8 transition-all duration-500 overflow-hidden hover:border-slate-600/50 hover:bg-slate-800/30"
          >
            {/* Gradient overlay — "unrevealed" effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent pointer-events-none z-10" />

            {/* Content */}
            <div className="relative z-20">
              <card.icon className={`w-10 h-10 ${card.iconColor}`} />
              <h3 className="text-xl font-bold text-slate-300 font-['Space_Grotesk'] mt-4">
                {card.title}
              </h3>
              <p className="text-slate-500 mt-2 leading-relaxed">
                {card.desc}
              </p>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${card.badgeBg} border ${card.badgeBorder} ${card.badgeText} text-xs font-medium mt-4`}
              >
                🚧 Segera Hadir
              </span>
            </div>

            {/* Subtle hover glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    index === 0
                      ? "radial-gradient(ellipse at 50% 80%, rgba(245,158,11,0.06), transparent 60%)"
                      : "radial-gradient(ellipse at 50% 80%, rgba(34,211,238,0.06), transparent 60%)",
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default ExpansionTeaser;
