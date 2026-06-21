import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2,
  Coffee,
  Home,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const productItems = [
    {
      type: "active" as const,
      icon: Building2,
      iconColor: "text-indigo-400",
      title: "Fintrax Business Solutions",
      desc: "Solusi dashboard akuntansi & manajemen cabang",
      badge: "Aktif",
      badgeClass:
        "bg-emerald-500/20 text-emerald-400 text-xs font-medium px-2 py-0.5 rounded-full",
    },
    {
      type: "disabled" as const,
      icon: Coffee,
      iconColor: "text-slate-500",
      title: "Fintrax Cafe & Retail",
      desc: "Manajemen kasir cepat & stok multi-outlet",
      badge: "Segera Hadir",
      badgeClass:
        "bg-slate-700/50 text-slate-400 text-xs px-2 py-0.5 rounded-full",
    },
    {
      type: "disabled" as const,
      icon: Home,
      iconColor: "text-slate-500",
      title: "Fintrax Service & Rent",
      desc: "Sistem pengelolaan sewa & layanan jasa",
      badge: "Segera Hadir",
      badgeClass:
        "bg-slate-700/50 text-slate-400 text-xs px-2 py-0.5 rounded-full",
    },
  ];

  const renderProductItem = (
    item: (typeof productItems)[0],
    index: number
  ) => {
    const content = (
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <item.icon className={`w-5 h-5 ${item.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`font-semibold text-sm ${
                item.type === "active" ? "text-white" : "text-slate-400"
              }`}
            >
              {item.title}
            </span>
            <span className={item.badgeClass}>{item.badge}</span>
          </div>
          <p
            className={`text-sm mt-0.5 ${
              item.type === "active" ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {item.desc}
          </p>
        </div>
      </div>
    );

    if (item.type === "active") {
      return (
        <Link
          key={index}
          to="/login"
          className="block hover:bg-slate-800/50 rounded-xl p-3 transition-all"
          onClick={() => {
            setDropdownOpen(false);
            setMobileMenuOpen(false);
          }}
        >
          {content}
        </Link>
      );
    }

    return (
      <div
        key={index}
        className="opacity-50 cursor-not-allowed p-3"
      >
        {content}
      </div>
    );
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "backdrop-blur-xl bg-slate-950/70 shadow-lg shadow-slate-950/50"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Branding */}
        <Link to="/" className="flex items-center gap-0.5">
          <span className="font-['Space_Grotesk'] text-xl font-bold text-white tracking-tight">
            Fintrax
          </span>
          <span
            className="w-2 h-2 rounded-full bg-emerald-400 inline-block ml-1"
            style={{
              boxShadow: "0 0 8px rgba(52,211,153,0.8)",
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
        </Link>

        {/* Desktop Nav Links (center) */}
        <div
          className="hidden md:flex items-center gap-6"
          ref={dropdownRef}
        >
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors duration-200 font-medium"
            >
              Produk
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 shadow-2xl"
                >
                  <div className="space-y-1">
                    {productItems.map((item, i) =>
                      renderProductItem(item, i)
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Desktop CTA (right) */}
        <div className="hidden md:flex items-center">
          <Link
            to="/login"
            className="border border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/20 px-5 py-2 rounded-full text-sm font-medium transition-all duration-300"
          >
            Masuk
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden text-slate-300 hover:text-white transition-colors"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Slide-in Panel */}
            <motion.div
              ref={mobileMenuRef}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800/50 z-50 md:hidden flex flex-col"
            >
              {/* Close button */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50">
                <span className="font-['Space_Grotesk'] text-lg font-bold text-white">
                  Menu
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Product Items */}
              <div className="flex-1 overflow-y-auto px-4 py-6">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider px-3 mb-3">
                  Produk
                </p>
                <div className="space-y-1">
                  {productItems.map((item, i) =>
                    renderProductItem(item, i)
                  )}
                </div>
              </div>

              {/* Mobile CTA */}
              <div className="px-6 py-4 border-t border-slate-800/50">
                <Link
                  to="/login"
                  className="block w-full text-center border border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/20 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Masuk
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
