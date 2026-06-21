import { motion } from "motion/react";
import {
  BookOpen,
  Layers,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const journalEntries = [
  {
    date: "09/06/26",
    desc: "Check-in Villa Deluxe #12",
    debit: "2.500.000",
    credit: "—",
  },
  {
    date: "09/06/26",
    desc: "Penjualan F&B — Cafe Outlet",
    debit: "—",
    credit: "385.000",
  },
  {
    date: "09/06/26",
    desc: "Sewa Aset — Kendaraan B-02",
    debit: "1.200.000",
    credit: "—",
  },
];

const FeaturesGrid = () => {
  return (
    <section
      id="features"
      className="relative py-24 sm:py-32"
      style={{ backgroundColor: "#060b18" }}
    >
      {/* Section Header */}
      <div className="max-w-2xl mx-auto text-center mb-16 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Fitur Unggulan
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold font-['Space_Grotesk'] text-white mt-4">
            Mesin Inti yang Menggerakkan Bisnis Anda
          </h2>
          <p className="text-slate-400 mt-4">
            Arsitektur modular yang menghubungkan setiap lini bisnis ke satu
            pusat kendali finansial.
          </p>
        </motion.div>
      </div>

      {/* Bento Grid */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 — Otomatisasi Jurnal Keuangan Terpusat (Large) */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="group relative rounded-2xl border border-slate-800/50 bg-slate-900/50 backdrop-blur-sm p-6 sm:p-8 transition-all duration-300 overflow-hidden md:col-span-2 md:row-span-2 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(99,102,241,0.15)] group-hover:border-indigo-500/50"
          >
            {/* Subtle glow on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.08), transparent 60%)",
                }}
              />
            </div>

            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white font-['Space_Grotesk']">
                Otomatisasi Jurnal Tercepat
              </h3>
              <p className="text-slate-400 mt-3 leading-relaxed">
                Setiap transaksi (kasir, invoice) langsung dikonversi otomatis menjadi jurnal akuntansi korporat secara real-time. Kecepatan pembuatan adalah keunggulan utama kami, memotong waktu administrasi harian hingga 80%.
              </p>

              {/* Mock Journal Table */}
              <div className="bg-slate-950/50 rounded-xl p-4 mt-6 border border-slate-800/50">
                {/* Table Header */}
                <div className="grid grid-cols-4 gap-2 pb-2 border-b border-slate-800/30 mb-2">
                  <span className="text-xs text-slate-600 font-medium">
                    Tanggal
                  </span>
                  <span className="text-xs text-slate-600 font-medium col-span-1">
                    Deskripsi
                  </span>
                  <span className="text-xs text-slate-600 font-medium text-right">
                    Debit
                  </span>
                  <span className="text-xs text-slate-600 font-medium text-right">
                    Kredit
                  </span>
                </div>

                {/* Table Rows */}
                {journalEntries.map((entry, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-4 gap-2 py-1.5 border-b border-slate-800/20 last:border-b-0"
                  >
                    <span className="text-xs text-slate-500 font-mono">
                      {entry.date}
                    </span>
                    <span className="text-xs text-slate-400 truncate col-span-1">
                      {entry.desc}
                    </span>
                    <span
                      className={`text-xs text-right font-mono ${
                        entry.debit !== "—"
                          ? "text-emerald-400/70"
                          : "text-slate-600"
                      }`}
                    >
                      {entry.debit}
                    </span>
                    <span
                      className={`text-xs text-right font-mono ${
                        entry.credit !== "—"
                          ? "text-rose-400/70"
                          : "text-slate-600"
                      }`}
                    >
                      {entry.credit}
                    </span>
                  </div>
                ))}

                {/* Blinking cursor effect */}
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800/20">
                  <div
                    className="w-1.5 h-4 bg-indigo-400/60 rounded-full"
                    style={{
                      animation: "blink 1.2s ease-in-out infinite",
                    }}
                  />
                  <span className="text-xs text-slate-600 italic">
                    Auto-recording...
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 2 — Modul Operasional Fleksibel */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="group relative rounded-2xl border border-slate-800/50 bg-slate-900/50 backdrop-blur-sm p-6 sm:p-8 transition-all duration-300 overflow-hidden hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(52,211,153,0.15)]"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 30%, rgba(52,211,153,0.08), transparent 60%)",
                }}
              />
            </div>

            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                <Layers className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white font-['Space_Grotesk']">
                Fitur Enterprise, Harga Bersahabat
              </h3>
              <p className="text-slate-400 mt-3 leading-relaxed text-sm">
                Akses dashboard multi-cabang terpadu dengan biaya langganan bulanan yang jauh lebih murah dibanding menyewa akuntan manual. Solusi multi-tenant yang sangat cost-effective.
              </p>

              {/* Sector Chips */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
                  Perhotelan
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400">
                  F&B
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400">
                  Penyewaan Aset
                </span>
              </div>
            </div>
          </motion.div>

          {/* Card 3 — Proteksi Data Berlapis */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="group relative rounded-2xl border border-slate-800/50 bg-slate-900/50 backdrop-blur-sm p-6 sm:p-8 transition-all duration-300 overflow-hidden hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(245,158,11,0.15)]"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 30%, rgba(245,158,11,0.08), transparent 60%)",
                }}
              />
            </div>

            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-white font-['Space_Grotesk']">
                Keamanan RLS Skala Menengah
              </h3>
              <p className="text-slate-400 mt-3 leading-relaxed text-sm">
                Dilindungi oleh Row Level Security (RLS) Supabase untuk
                memastikan data keuangan operasional Anda terisolasi dengan aman,
                rahasia, dan anti-bocor lintas cabang.
              </p>

              {/* Security Badges */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400">
                  RLS Protected
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300">
                  Data Isolation
                </span>
              </div>
            </div>
          </motion.div>

          {/* Card 4 — Stats Bar (Wide) */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="group relative rounded-2xl border border-slate-800/30 bg-slate-900/50 backdrop-blur-sm transition-all duration-300 overflow-hidden md:col-span-3 hover:-translate-y-1 group-hover:border-slate-700/50"
          >
            <div className="flex flex-col sm:flex-row items-center justify-around py-6 sm:py-8 gap-6">
              {/* Stat 1 */}
              <div className="text-center">
                <span className="text-3xl font-bold text-white font-['Space_Grotesk']">
                  Multi-Sektor
                </span>
                <p className="text-slate-400 text-sm mt-1">
                  Satu Platform Terintegrasi
                </p>
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-12 bg-slate-800" />

              {/* Stat 2 */}
              <div className="text-center">
                <span className="text-3xl font-bold text-white font-['Space_Grotesk']">
                  Real-time
                </span>
                <p className="text-slate-400 text-sm mt-1">
                  Sinkronisasi Jurnal
                </p>
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-12 bg-slate-800" />

              {/* Stat 3 */}
              <div className="text-center">
                <span className="text-3xl font-bold text-white font-['Space_Grotesk']">
                  99.9%
                </span>
                <p className="text-slate-400 text-sm mt-1">
                  Uptime Guarantee
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Blink animation keyframes */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </section>
  );
};

export default FeaturesGrid;
