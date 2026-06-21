import { motion } from "motion/react";
import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const PricingSection = () => {
  return (
    <section
      id="pricing"
      className="relative py-24 sm:py-32"
      style={{ backgroundColor: "#040711" }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute left-1/2 -top-24 -translate-x-1/2 w-[800px] h-[400px] opacity-20"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(52,211,153,0.3) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Harga Sahabat UMKM
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-['Space_Grotesk'] text-white mt-4">
              Investasi Kecil, Dampak Enterprise
            </h2>
            <p className="text-slate-400 mt-4">
              Mulai dari skala kecil, bayar sesuai pertumbuhan bisnis Anda. Tanpa
              biaya setup tersembunyi.
            </p>
          </motion.div>
        </div>

        {/* Pricing Card */}
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative group rounded-3xl border border-emerald-500/30 bg-slate-900/80 backdrop-blur-xl p-8 sm:p-10 text-center overflow-hidden"
          >
            {/* Highlight glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent opacity-50" />
            
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-white font-['Space_Grotesk'] mb-2">
                Fintrax Business
              </h3>
              <p className="text-slate-400 text-sm mb-6">
                Cocok untuk Hotel, Resort, & Manajemen Cabang
              </p>
              
              <div className="flex items-baseline justify-center gap-1 mb-8">
                <span className="text-slate-400 font-medium">Mulai dari</span>
                <span className="text-4xl sm:text-5xl font-bold text-white font-['Space_Grotesk'] ml-2">
                  Rp 150rb
                </span>
                <span className="text-slate-400">/bulan</span>
              </div>

              <ul className="space-y-4 mb-8 text-left">
                {[
                  "Unlimited Pencatatan Jurnal Otomatis",
                  "Dashboard Multi-Cabang / Properti",
                  "Integrasi Laporan Laba Rugi Real-time",
                  "Row Level Security (RLS) Database",
                  "Dukungan Prioritas via WhatsApp",
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-slate-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/register"
                className="block w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(52,211,153,0.4)]"
              >
                Mulai Uji Coba Gratis
              </Link>
              <p className="text-xs text-slate-500 mt-4">
                Tidak perlu kartu kredit untuk mendaftar.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
