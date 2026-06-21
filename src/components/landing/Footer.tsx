const Footer = () => {
  return (
    <footer className="relative" style={{ backgroundColor: "#040711" }}>
      {/* Top gradient glow line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

      {/* Border */}
        <div className="max-w-7xl mx-auto px-6 pt-12 pb-8">
          {/* Tagline */}
          <div className="mb-12 text-center">
            <h3 className="text-lg sm:text-xl font-medium text-slate-400">
              Fintrax: <span className="text-emerald-400 font-semibold">Cepat</span>,{' '}
              <span className="text-emerald-400 font-semibold">Hemat</span>,{' '}
              <span className="text-emerald-400 font-semibold">Terintegrasi</span>. Solusi UMKM Menuju Enterprise.
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
  );
};

export default Footer;
