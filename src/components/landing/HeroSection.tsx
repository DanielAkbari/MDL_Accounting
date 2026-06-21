import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Play, Sparkles } from "lucide-react";

const HeroSection = () => {
  return (
    <section
      className="relative overflow-hidden min-h-[90vh] flex items-center justify-center pt-24"
      style={{ backgroundColor: "#060b18" }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Radial gradient glow */}
        <div
          className="absolute"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, rgba(34,211,238,0.05) 40%, transparent 70%)",
            width: "120%",
            height: "120%",
            left: "-10%",
            top: "-10%",
          }}
        />

        {/* Dot grid overlay */}
        <div className="dot-grid absolute inset-0 opacity-30" />

        {/* Floating ambient orb 1 */}
        <div
          className="absolute w-72 h-72 rounded-full top-20 -left-20"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.2), transparent 70%)",
            animation: "float 8s ease-in-out infinite",
          }}
        />

        {/* Floating ambient orb 2 */}
        <div
          className="absolute w-96 h-96 rounded-full bottom-20 -right-32"
          style={{
            background:
              "radial-gradient(circle, rgba(34,211,238,0.1), transparent 70%)",
            animation: "float 12s ease-in-out infinite 2s",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            Solusi Keuangan Hemat untuk UMKM & Menengah
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold font-['Space_Grotesk'] leading-tight tracking-tight gradient-text mt-6"
        >
          Efisiensi Finansial Tanpa Mahal, Khusus untuk Bisnis Menengah.
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mt-6 leading-relaxed"
        >
          Otomatisasikan pembukuan, pantau arus kas cabang secara real-time,
          dan kunci keamanan data operasional Anda dalam satu dashboard digital
          terintegrasi. Fintrax memberikan solusi kecepatan pembuatan dan harga
          yang sangat bersahabat, menghubungkan setiap transaksi langsung ke jurnal
          akuntansi Anda tanpa celah kebocoran.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
        >
          {/* Primary CTA */}
          <Link
            to="/register"
            className="cta-glow inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-semibold rounded-xl text-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]"
          >
            Mulai Sekarang (Coba Gratis)
            <ArrowRight className="w-5 h-5" />
          </Link>

          {/* Secondary CTA */}
          <button
            onClick={() =>
              document
                .getElementById("features")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="inline-flex items-center gap-2 px-8 py-4 border border-slate-600 text-slate-300 rounded-xl text-lg font-medium hover:bg-slate-800/50 hover:border-slate-500 transition-all duration-300"
          >
            Lihat Demo
            <Play className="w-5 h-5" />
          </button>
        </motion.div>
      </div>

      {/* Float animation keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-20px) translateX(10px); }
          66% { transform: translateY(10px) translateX(-10px); }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;
