import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import fintraxLogo from '../assets/fintrax_logo_transparent.png';
import Loader from '../components/ui/loader-4';
import { GradientBackground } from '../components/ui/GradientBackground';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message || 'Email atau password salah!');
      } else if (data?.user) {
        sessionStorage.setItem('is_authenticated', 'true');
        sessionStorage.setItem('current_user', JSON.stringify({
          username: data.user.user_metadata?.business_name || data.user.email?.split('@')[0] || 'User',
          role: 'admin'
        }));
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      setError('Terjadi kesalahan sistem. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <GradientBackground>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md p-6"
      >
        {isLoading && <Loader fullScreen={true} />}

        {/* Back to home */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Kembali ke Beranda
        </Link>

        {/* Login Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 shadow-2xl">
          {/* Branding */}
          <div className="text-center mb-8 flex flex-col items-center">
            <img 
              src={fintraxLogo} 
              alt="Fintrax Logo" 
              className="h-8 w-auto object-contain mb-4 select-none" 
            />
            <h1 className="text-xl font-semibold text-white font-['Space_Grotesk']">
              Masuk ke Akun Anda
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Akses dashboard dan kelola bisnis Anda
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="masukkan email terdaftar"
                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Lupa Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:hover:scale-100"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Masuk'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-slate-400">Belum memiliki akun Fintrax? </span>
            <a 
              href="https://wa.me/6287811042202" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[#10F4AF] hover:text-[#00D2FF] font-semibold transition-colors"
            >
              Daftar Sekarang
            </a>
          </div>


        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6 opacity-70">
          Powered by Helpora.id
        </p>
      </motion.div>
    </GradientBackground>
  );
}
