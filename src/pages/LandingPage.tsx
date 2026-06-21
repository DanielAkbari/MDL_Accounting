import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check, Sparkles, Coffee, Home, ChevronDown } from 'lucide-react';
import fintraxIcon from '../assets/fintrax_logo_transparent.png';
import dashboardPreview from '../assets/dashboard_preview.png';
import Loader from '../components/ui/loader-4';

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 25 }, (_, i) => {
    // Spanning a larger vertical height (2000px) to cover Hero, Dashboard Preview, and Features
    const startY = (position === 1 ? -250 : 200) + i * 70;
    const endY = (position === 1 ? 1200 : 1750) + i * 70;
    
    // Control points setup for deep S-curves flowing all the way down
    const controlX1 = 450 + position * 180;
    const controlY1 = startY + (position === 1 ? 900 : -600) + Math.sin(i * 0.5) * 80;
    const controlX2 = 1050 - position * 180;
    const controlY2 = endY + (position === 1 ? -900 : 600) - Math.sin(i * 0.5) * 80;

    return {
      id: i,
      d: `M -100,${startY} C ${controlX1},${controlY1} ${controlX2},${controlY2} 1600,${endY}`,
      color: i % 2 === 0 ? "rgba(16,244,175,0.22)" : "rgba(0,210,255,0.22)", // Enhanced brightness/opacity
      width: 3.5 + i * 0.16, // Much thicker stroke widths for larger representation
    };
  });

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg
        className="w-full h-full"
        viewBox="0 0 1440 2000"
        fill="none"
        preserveAspectRatio="none"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke={path.color}
            strokeWidth={path.width}
            strokeOpacity={0.25 + path.id * 0.015} // Higher opacity profile
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.35, 0.7, 0.35],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 22 + Math.random() * 10, // Slightly slower, more majestic floating speed
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [showLoader, setShowLoader] = useState(false);
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "Apakah data keuangan bisnis saya aman di Fintrax?",
      a: "Sangat aman. Fintrax dirancang dengan arsitektur modern menggunakan Row Level Security (RLS) PostgreSQL dari Supabase. Hal ini memastikan seluruh data transaksi, jurnal, dan laporan keuangan Anda diisolasi secara ketat dan hanya dapat diakses oleh pengguna yang berwenang."
    },
    {
      q: "Bagaimana cara kerja otomatisasi Jurnal AI Fintrax?",
      a: "Anda cukup mengetikkan transaksi dalam bahasa sehari-hari (misal: 'Beli ATK kantor Rp 75.000'). AI kami secara cerdas memetakan deskripsi tersebut ke bagan akun (CoA) yang relevan, lalu membuat jurnal debit dan kredit secara otomatis tanpa Anda perlu paham detail teknis debit/kredit."
    },
    {
      q: "Apakah Fintrax mendukung sistem multi-cabang atau multi-proyek?",
      a: "Ya, Fintrax sangat mendukung pengelolaan multi-proyek maupun multi-cabang (seperti Malang Dreamland yang mengelola pariwisata, kafe, dan properti). Anda dapat memantau performa keuangan masing-masing proyek secara terpisah maupun melihat konsolidasi laporan secara menyeluruh."
    },
    {
      q: "Apakah ada biaya tersembunyi atau limitasi transaksi?",
      a: "Tidak ada biaya tersembunyi. Biaya langganan bulanan Fintrax mencakup seluruh fitur tanpa batasan jumlah transaksi (unlimited). Kami berkomitmen memberikan transparansi penuh agar Anda bisa fokus mengembangkan bisnis."
    }
  ];

  const handleSignIn = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowLoader(true);
    
    const duration = 1200; // 1.2s total duration
    const intervalTime = 25;
    const steps = duration / intervalTime;
    let step = 0;
    
    const interval = setInterval(() => {
      step++;
      const progress = Math.min((step / steps) * 100, 100);
      setLoaderProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          navigate('/login');
        }, 150);
      }
    }, intervalTime);
  };
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-[#0b131a] text-white font-['Inter',sans-serif] relative overflow-hidden flex flex-col justify-between"
    >
      
      {/* Background radial glow */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle at 75% 30%, rgba(16,244,175,0.06) 0%, rgba(0,210,255,0.03) 35%, transparent 70%)'
        }}
      />
      
      {/* Background dot grid pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(circle,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[size:24px_24px] z-0" />

      {/* Dynamic Background Paths */}
      <div className="absolute top-0 left-0 right-0 h-[220vh] overflow-hidden pointer-events-none z-0 opacity-80">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      {/* Animated Glowing Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Orb 1: Cyan Top */}
        <motion.div
          animate={{
            x: [0, 80, -40, 0],
            y: [0, -60, 50, 0],
            scale: [1, 1.15, 0.95, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[10%] left-[10%] w-[350px] h-[350px] rounded-full bg-[#00D2FF]/18 blur-[120px]"
        />

        {/* Orb 2: Green Middle */}
        <motion.div
          animate={{
            x: [0, -100, 60, 0],
            y: [0, 80, -50, 0],
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[35%] right-[10%] w-[400px] h-[400px] rounded-full bg-[#10F4AF]/15 blur-[130px]"
        />

        {/* Orb 3: Purple Middle-Bottom */}
        <motion.div
          animate={{
            x: [0, 70, -80, 0],
            y: [0, 80, -100, 0],
            scale: [1, 1.05, 0.95, 1],
          }}
          transition={{
            duration: 35,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[65%] left-[15%] w-[380px] h-[380px] rounded-full bg-[#8B5CF6]/12 blur-[125px]"
        />

        {/* Orb 4: Cyan Bottom */}
        <motion.div
          animate={{
            x: [0, -50, 50, 0],
            y: [0, -60, 60, 0],
          }}
          transition={{
            duration: 28,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-[10%] right-[15%] w-[320px] h-[320px] rounded-full bg-[#00D2FF]/15 blur-[120px]"
        />
      </div>



      {/* 4-Point Star Accent on Bottom-Right of Page */}
      <div className="absolute bottom-24 right-16 pointer-events-none z-0 select-none animate-pulse" style={{ animationDuration: '6s' }}>
        <svg className="w-16 h-16 text-[#94a3b8]/20" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.8">
          <path d="M50,15 Q50,50 85,50 Q50,50 50,85 Q50,50 15,50 Q50,50 50,15 Z" fill="currentColor" className="text-[#94a3b8]/10" />
        </svg>
      </div>

      {/* Sticky Navigation Bar */}
      <motion.header 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 backdrop-blur-lg bg-[#0b131a]/85 border-b border-white/5 transition-all duration-300"
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <img 
              src={fintraxIcon} 
              alt="Fintrax Logo" 
              className="h-8 sm:h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-105" 
            />
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200">Fitur Utama</a>
            <a href="#testimonials" className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200">Testimoni</a>
            <a href="#pricing" className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200">Harga</a>
            <a href="#faq" className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200">Tanya Jawab</a>
          </nav>

          {/* Action Button */}
          <div className="flex items-center">
            <button 
              onClick={handleSignIn}
              className="bg-[#10F4AF] text-[#0b131a] font-bold text-sm px-6 py-2.5 rounded-lg shadow-[0_0_20px_rgba(16,244,175,0.3)] hover:shadow-[0_0_30px_rgba(16,244,175,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <main className="z-10 relative pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-6 w-full flex flex-col items-center text-center space-y-8">
          
          {/* Premium Brand Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2.5 bg-white/5 border border-white/10 px-3.5 py-2 rounded-full w-fit backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.02)] select-none hover:bg-white/10 transition-colors duration-300"
          >
            <img src={fintraxIcon} alt="Fintrax Logo" className="h-4 sm:h-4.5 w-auto object-contain" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#10F4AF]" style={{ boxShadow: '0 0 8px #10F4AF' }} />
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-300">AI-Powered & Trusted</span>
          </motion.div>
          
          {/* Title */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-4xl sm:text-5xl lg:text-[64px] leading-[1.15] font-bold text-white tracking-tight max-w-3xl font-sans font-extrabold"
          >
            Pencatatan Keuangan <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D2FF] to-[#10F4AF]">
              Murah & Terpercaya
            </span>
          </motion.h1>
          
          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-slate-400 text-base sm:text-lg lg:text-[21px] leading-relaxed max-w-2xl font-sans"
          >
            Fintrax adalah aplikasi pembukuan akuntansi online paling terjangkau, aman, dan andal untuk UMKM. Dilengkapi asisten AI cerdas untuk membantu analisis laporan keuangan secara instan.
          </motion.p>
          
          {/* CTA Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-4"
          >
            <a 
              href="https://wa.me/6287811042202"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#10F4AF] text-[#0b131a] font-extrabold text-base px-8 py-4 rounded-xl shadow-[0_0_25px_rgba(16,244,175,0.25)] hover:shadow-[0_0_35px_rgba(16,244,175,0.55)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 cursor-pointer flex items-center gap-2.5"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.859-4.42 9.863-9.864.002-2.637-1.03-5.115-2.906-6.99C16.55 1.87 14.075 1.83 11.474 1.83c-5.439 0-9.859 4.421-9.863 9.865-.001 1.839.49 3.633 1.42 5.207l-.993 3.627 3.71-.975zm11.367-7.382c-.315-.158-1.86-.92-2.148-1.025-.289-.105-.499-.158-.709.158-.21.315-.813 1.025-.996 1.235-.183.21-.367.236-.682.079-.315-.158-1.33-.49-2.532-1.562-.936-.835-1.568-1.866-1.751-2.181-.183-.315-.02-.485.137-.642.142-.141.315-.367.473-.551.158-.184.21-.315.315-.526.105-.21.053-.394-.026-.551-.079-.158-.709-1.708-.971-2.339-.256-.615-.517-.532-.709-.541-.184-.009-.394-.011-.604-.011-.21 0-.551.079-.84.394-.289.315-1.103 1.077-1.103 2.627 0 1.55 1.129 3.047 1.286 3.258.158.21 2.221 3.391 5.378 4.754.751.325 1.337.519 1.795.664.755.24 1.442.206 1.986.125.606-.09 1.86-.761 2.122-1.458.263-.697.263-1.299.184-1.42-.079-.12-.289-.22-.604-.378z"/>
              </svg>
              Hubungi via WhatsApp
            </a>
          </motion.div>
          
        </div>
      </main>

      {/* Large Raised Dashboard Preview showcase section */}
      <div className="w-full max-w-5xl mx-auto px-6 pb-24 relative z-10">
        {/* Background Glow behind mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.9, ease: "easeOut" }}
          className="absolute inset-0 m-auto w-[600px] h-[350px] rounded-full bg-gradient-to-tr from-[#00D2FF]/20 to-[#10F4AF]/20 blur-[120px] -z-10 pointer-events-none"
        />

        {/* Large Screenshot with 3D raised border and neon shadows with scroll re-reveal */}
        <motion.div 
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full transform transition-all duration-500 hover:scale-[1.01] relative select-none rounded-2xl p-[1.5px] bg-gradient-to-tr from-[#00D2FF]/40 to-[#10F4AF]/40 shadow-[0_35px_80px_-15px_rgba(0,0,0,0.9),0_0_50px_rgba(0,210,255,0.25),0_0_90px_rgba(16,244,175,0.1)]"
        >
          <div className="rounded-[14px] overflow-hidden bg-[#060b18] border border-slate-900/60 relative">
            <img 
              src={dashboardPreview} 
              alt="Fintrax Dashboard Preview" 
              className="w-full h-auto object-cover" 
            />
            {/* Subtle overlay glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b131a]/40 via-transparent to-transparent pointer-events-none" />
          </div>
        </motion.div>
      </div>

      {/* Feature Cards Grid Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 pb-24 pt-8 w-full z-10">
        
        {/* Feature Section Header with scroll reveal */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00D2FF]/10 border border-[#00D2FF]/20 text-[#00D2FF] text-xs font-semibold uppercase tracking-wider mb-4">
              Fitur Unggulan
            </span>
            <h2 className="text-3xl font-bold text-white tracking-tight font-sans">
              Segala Kemudahan Pembukuan UMKM
            </h2>
            <p className="text-slate-400 mt-2 text-sm font-sans">
              Fintrax dirancang khusus dengan fitur canggih untuk menyederhanakan akuntansi bisnis Anda.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: Murah & Terpercaya */}
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="bg-[#0e161f]/50 border border-slate-850 hover:border-slate-700/50 rounded-xl p-8 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden text-left"
          >
            <div className="w-14 h-14 rounded-lg bg-[#0e161f] border border-[#00D2FF]/30 shadow-[0_0_15px_rgba(0,210,255,0.1)] flex items-center justify-center mb-6 transition-all duration-300 group-hover:border-[#00D2FF]/60 group-hover:shadow-[0_0_20px_rgba(0,210,255,0.3)]">
              {/* Trust Badge Icon SVG */}
              <svg className="w-7 h-7 text-[#00D2FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-3 tracking-tight font-sans">Murah & Terpercaya</h3>
            <p className="text-slate-400 text-sm leading-relaxed font-sans">
              Solusi pencatatan akuntansi cloud termurah yang sangat ramah UMKM. Transparan, terpercaya, dan tanpa biaya lisensi tersembunyi.
            </p>
          </motion.div>

          {/* Card 2: AI Assistant & Analysis */}
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="bg-[#0e161f]/50 border border-slate-850 hover:border-slate-700/50 rounded-xl p-8 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden text-left"
          >
            <div className="w-14 h-14 rounded-lg bg-[#0e161f] border border-[#10F4AF]/30 shadow-[0_0_15px_rgba(16,244,175,0.1)] flex items-center justify-center mb-6 transition-all duration-300 group-hover:border-[#10F4AF]/60 group-hover:shadow-[0_0_20px_rgba(16,244,175,0.3)]">
              {/* AI Analysis Icon SVG */}
              <svg className="w-7 h-7 text-[#10F4AF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M7.76 16.24l-2.83 2.83M19.07 4.93l-2.83 2.83" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-3 tracking-tight font-sans">Analisis Asisten AI</h3>
            <p className="text-slate-400 text-sm leading-relaxed font-sans">
              Dapatkan analisis instan untuk memonitor kesehatan keuangan, rasio laba rugi, dan prediksi arus kas Anda melalui bantuan asisten AI.
            </p>
          </motion.div>

          {/* Card 3: Security */}
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="bg-[#0e161f]/50 border border-slate-850 hover:border-slate-700/50 rounded-xl p-8 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden text-left"
          >
            <div className="w-14 h-14 rounded-lg bg-[#0e161f] border border-[#00D2FF]/30 shadow-[0_0_15px_rgba(0,210,255,0.1)] flex items-center justify-center mb-6 transition-all duration-300 group-hover:border-[#00D2FF]/60 group-hover:shadow-[0_0_20px_rgba(0,210,255,0.3)]">
              {/* Security Shield Icon SVG */}
              <svg className="w-7 h-7 text-[#00D2FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <rect x="9" y="11" width="6" height="5" rx="1" />
                <path d="M10.5 11V9.5a1.5 1.5 0 0 1 3 0V11" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-3 tracking-tight font-sans">Multi-Proyek & Keamanan RLS</h3>
            <p className="text-slate-400 text-sm leading-relaxed font-sans">
              Kelola unit bisnis pariwisata, properti, atau cabang lain secara terpisah dengan aman menggunakan proteksi data Row Level Security (RLS) Supabase.
            </p>
          </motion.div>

        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="relative py-20 bg-[#0a0f16]/30 border-t border-white/5 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10F4AF]/10 border border-[#10F4AF]/20 text-[#10F4AF] text-xs font-semibold uppercase tracking-wider mb-4">
                Ulasan Pengguna
              </span>
              <h2 className="text-3xl font-bold text-white tracking-tight font-sans">
                Dipercaya oleh Profesional Akuntansi
              </h2>
              <p className="text-slate-400 mt-2 text-sm font-sans">
                Bagaimana Fintrax membantu meningkatkan efisiensi pembukuan bisnis nyata.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Testimonial 1: Senior Accountant Malang Dreamland */}
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#0e161f]/40 border border-slate-850 rounded-2xl p-8 backdrop-blur-md relative overflow-hidden group hover:border-[#10F4AF]/30 transition-all duration-300"
            >
              <div className="absolute top-2 right-6 text-slate-800/20 text-7xl font-serif pointer-events-none select-none group-hover:text-[#10F4AF]/10 transition-colors">“</div>
              <div className="flex gap-1 text-[#10F4AF] mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 fill-current text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed italic mb-6 relative z-10 text-left font-sans">
                "Semenjak beralih ke Fintrax, konsolidasi laporan keuangan untuk unit pariwisata dan properti kami di Malang Dreamland menjadi 10x lebih cepat. Laporan Laba Rugi real-time sangat membantu direksi mengambil keputusan investasi secara instan. Sistemnya aman, andal, dan sangat mudah digunakan!"
              </p>
              <div className="flex items-center gap-4 text-left font-sans">
                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-sm font-bold text-white uppercase border border-slate-700">
                  HW
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Hendri Wahyono, S.Ak.</h4>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">Senior Accountant, Malang Dreamland</p>
                </div>
              </div>
            </motion.div>

            {/* Testimonial 2: Owner Resto Dreamland */}
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#0e161f]/40 border border-slate-850 rounded-2xl p-8 backdrop-blur-md relative overflow-hidden group hover:border-[#00D2FF]/30 transition-all duration-300"
            >
              <div className="absolute top-2 right-6 text-slate-800/20 text-7xl font-serif pointer-events-none select-none group-hover:text-[#00D2FF]/10 transition-colors">“</div>
              <div className="flex gap-1 text-[#00D2FF] mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 fill-current text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed italic mb-6 relative z-10 text-left font-sans">
                "Fintrax memudahkan kami memonitor arus kas bersih dan performa harian kafe secara real-time dari HP. Kami tidak perlu lagi menunggu laporan bulanan manual dari akuntan luar. Sangat hemat waktu dan membantu operasional resto kami sehari-hari!"
              </p>
              <div className="flex items-center gap-4 text-left font-sans">
                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-sm font-bold text-white uppercase border border-slate-700">
                  SM
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Sri Mulyani</h4>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">Pemilik Kafe & Resto Dreamland</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-24 sm:py-32 bg-[#0a0f16]/60 border-t border-white/5 z-10">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div
            className="absolute left-1/2 -top-24 -translate-x-1/2 w-[800px] h-[400px] opacity-10"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(16,244,175,0.3) 0%, transparent 70%)',
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#10F4AF]/10 border border-[#10F4AF]/20 text-[#10F4AF] text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Harga Sahabat UMKM
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Investasi Kecil, Dampak Enterprise
              </h2>
              <p className="text-slate-400 mt-4 max-w-lg mx-auto">
                Mulai dari skala kecil, bayar sesuai pertumbuhan bisnis Anda. Tanpa biaya setup tersembunyi.
              </p>
            </motion.div>
          </div>

          {/* Pricing Card */}
          <div className="max-w-lg mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative group rounded-3xl border border-[#10F4AF]/20 bg-[#0e161f]/80 backdrop-blur-xl p-8 sm:p-10 text-center overflow-hidden shadow-[0_0_30px_rgba(16,244,175,0.02)] hover:shadow-[0_0_45px_rgba(16,244,175,0.08)] transition-all duration-500"
            >
              {/* Highlight glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#10F4AF]/5 to-transparent opacity-50" />
              
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white mb-2">
                  Fintrax Business
                </h3>
                <p className="text-slate-400 text-sm mb-6">
                  Cocok untuk Hotel, Resort, & Manajemen Cabang
                </p>
                
                <div className="flex items-baseline justify-center gap-1 mb-8">
                  <span className="text-slate-400 font-medium">Mulai dari</span>
                  <span className="text-4xl sm:text-5xl font-bold text-white ml-2">
                    Rp 150rb
                  </span>
                  <span className="text-slate-400">/bulan</span>
                </div>

                <ul className="space-y-4 mb-8 text-left max-w-xs mx-auto">
                  {[
                    "Unlimited Pencatatan Jurnal Otomatis",
                    "Dashboard Multi-Cabang / Properti",
                    "Integrasi Laporan Laba Rugi Real-time",
                    "Row Level Security (RLS) Database",
                    "Dukungan Prioritas via WhatsApp",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#10F4AF] shrink-0 mt-0.5" />
                      <span className="text-slate-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="https://wa.me/6287811042202"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-4 bg-[#10F4AF] hover:bg-[#10F4AF]/80 text-[#0b131a] font-bold rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,244,175,0.4)] cursor-pointer text-center"
                >
                  Hubungi Kami via WhatsApp
                </a>
                <p className="text-xs text-slate-500 mt-4">
                  Tidak perlu kartu kredit untuk mendaftar.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Expansion Teaser Section */}
      <section className="relative py-24 sm:py-32 bg-[#0b131a] border-t border-white/5 z-10">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-[#10F4AF] animate-pulse" />
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                Segera Hadir di Ekosistem Fintrax
              </h2>
            </div>
            <p className="text-slate-400 mt-4 max-w-md mx-auto">
              Kami sedang membangun ekosistem lengkap untuk berbagai jenis bisnis Anda.
            </p>
          </motion.div>
        </div>

        {/* Cards */}
        <div className="max-w-4xl mx-auto mt-16 grid grid-cols-1 sm:grid-cols-2 gap-6 px-6">
          
          {/* Card 1: Fintrax Cafe */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative group rounded-2xl border border-dashed border-slate-800 bg-[#0e161f]/20 backdrop-blur-sm p-8 transition-all duration-500 overflow-hidden hover:border-[#10F4AF]/30 hover:bg-[#0e161f]/30"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b131a]/80 to-transparent pointer-events-none z-10" />
            <div className="relative z-20">
              <Coffee className="w-10 h-10 text-[#10F4AF]/60" />
              <h3 className="text-xl font-bold text-slate-300 mt-4">
                Fintrax Cafe & Retail
              </h3>
              <p className="text-slate-500 mt-2 leading-relaxed text-sm">
                Manajemen operasional kafe & restoran terintegrasi. Dari pemesanan, stok bahan baku, hingga laporan penjualan harian.
              </p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10F4AF]/10 border border-[#10F4AF]/20 text-[#10F4AF]/80 text-xs font-medium mt-4">
                🚧 Segera Hadir
              </span>
            </div>
          </motion.div>

          {/* Card 2: Fintrax Rent */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative group rounded-2xl border border-dashed border-slate-800 bg-[#0e161f]/20 backdrop-blur-sm p-8 transition-all duration-500 overflow-hidden hover:border-[#00D2FF]/30 hover:bg-[#0e161f]/30"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b131a]/80 to-transparent pointer-events-none z-10" />
            <div className="relative z-20">
              <Home className="w-10 h-10 text-[#00D2FF]/60" />
              <h3 className="text-xl font-bold text-slate-300 mt-4">
                Fintrax Service & Rent
              </h3>
              <p className="text-slate-500 mt-2 leading-relaxed text-sm">
                Sistem pengelolaan sewa properti & aset digital. Tracking kontrak, pembayaran, dan maintenance dalam satu tempat.
              </p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00D2FF]/10 border border-[#00D2FF]/20 text-[#00D2FF]/80 text-xs font-medium mt-4">
                🚧 Segera Hadir
              </span>
            </div>
          </motion.div>

        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative py-24 bg-[#0b131a] border-t border-white/5 z-10">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10F4AF]/10 border border-[#10F4AF]/20 text-[#10F4AF] text-xs font-semibold uppercase tracking-wider mb-4">
                Tanya Jawab (FAQ)
              </span>
              <h2 className="text-3xl font-bold text-white tracking-tight font-sans">
                Pertanyaan yang Sering Diajukan
              </h2>
              <p className="text-slate-400 mt-2 text-sm font-sans">
                Segala hal yang perlu Anda ketahui tentang sistem akuntansi online Fintrax.
              </p>
            </motion.div>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 30, scale: 0.98 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.6, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  className={`bg-[#0e161f]/50 border ${
                    isOpen ? 'border-[#10F4AF]/30 shadow-[0_0_20px_rgba(16,244,175,0.05)]' : 'border-slate-850 hover:border-slate-700/50'
                  } rounded-xl overflow-hidden backdrop-blur-xl transition-all duration-300`}
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left font-sans focus:outline-none cursor-pointer"
                  >
                    <span className="font-semibold text-white text-sm sm:text-base pr-4">{faq.q}</span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isOpen ? 'bg-[#10F4AF]/10 text-[#10F4AF]' : 'bg-white/5 text-slate-400'
                    }`}>
                      <ChevronDown 
                        className={`w-4 h-4 transition-transform duration-300 ${
                          isOpen ? 'transform rotate-180' : ''
                        }`} 
                      />
                    </div>
                  </button>
                  
                  {/* Smooth height transition wrapper */}
                  <div 
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isOpen ? 'max-h-60 border-t border-white/5' : 'max-h-0'
                    }`}
                  >
                    <div className="p-6 text-slate-400 text-sm leading-relaxed font-sans text-left">
                      {faq.a}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-[#0a0f16]" id="security">
        {/* Top gradient glow line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#10F4AF]/25 to-transparent" />

        <div className="max-w-7xl mx-auto px-6 pt-12 pb-8">
          {/* Tagline */}
          <div className="mb-12 text-center">
            <h3 className="text-lg sm:text-xl font-medium text-slate-400">
              Fintrax: <span className="text-[#10F4AF] font-semibold">Cepat</span>,{' '}
              <span className="text-[#10F4AF] font-semibold">Hemat</span>,{' '}
              <span className="text-[#10F4AF] font-semibold">Terintegrasi</span>. Solusi UMKM Menuju Enterprise.
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-800/50">
            {/* Left */}
            <p className="text-sm text-slate-500">
              © 2026 Fintrax. All rights reserved.
            </p>

            {/* Right */}
            <p className="text-xs text-slate-600 opacity-70">
              Powered by Helpora.id
            </p>
          </div>
        </div>
      </footer>

      {/* Futuristic Sign In Loading Overlay */}
      {showLoader && (
        <Loader fullScreen={true} />
      )}

    </motion.div>
  );
}
