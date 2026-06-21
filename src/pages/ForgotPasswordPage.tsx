import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isConfigured } from '../lib/supabase';
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import fintraxLogo from '../assets/fintrax_logo_transparent.png';
import Loader from '../components/ui/loader-4';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/dashboard`,
      });

      if (resetError) {
        setError(resetError.message || 'Gagal mengirim email reset. Silakan coba lagi.');
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      console.error(err);
      setError('Terjadi kesalahan sistem. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ backgroundColor: '#060b18' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(52,211,153,0.1) 0%, transparent 60%)',
              width: '100%',
              height: '100%',
            }}
          />
          <div className="dot-grid absolute inset-0 opacity-20" />
        </div>

        <div className="relative z-10 w-full max-w-md text-center">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white font-['Space_Grotesk'] mb-3">
              Email Terkirim!
            </h1>
            <p className="text-slate-400 leading-relaxed mb-2">
              Link reset password telah dikirim ke:
            </p>
            <p className="text-white font-medium mb-6">{email}</p>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              Silakan cek inbox (atau folder spam) email Anda dan klik link yang diberikan untuk mengatur password baru.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105"
            >
              Kembali ke Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" 
      style={{ backgroundColor: '#060b18' }}
    >
      {isLoading && <Loader fullScreen={true} />}
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.1) 0%, rgba(34,211,238,0.03) 40%, transparent 70%)',
            width: '100%',
            height: '100%',
          }}
        />
        <div className="dot-grid absolute inset-0 opacity-20" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back to login */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Kembali ke Login
        </Link>

        {/* Forgot Password Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 shadow-2xl">
          {/* Branding & Icon */}
          <div className="text-center mb-8 flex flex-col items-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
              <Mail className="w-7 h-7 text-indigo-400" />
            </div>
            <img 
              src={fintraxLogo} 
              alt="Fintrax Logo" 
              className="h-8 w-auto object-contain mb-4 select-none" 
            />
            <h1 className="text-xl font-semibold text-white font-['Space_Grotesk']">
              Lupa Password?
            </h1>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Masukkan email yang terdaftar dan kami akan mengirimkan link untuk mengatur password baru.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {error}
            </div>
          )}

          {!isConfigured && (
            <div className="mb-6 px-4 py-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm leading-relaxed">
              <strong className="block mb-1 font-semibold text-amber-300 text-xs uppercase tracking-wider">Konfigurasi Supabase Belum Lengkap</strong>
              Supabase URL atau Anon Key belum diatur di Vercel/lingkungan Anda. Harap tambahkan <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-200">VITE_SUPABASE_URL</code> dan <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-200">VITE_SUPABASE_ANON_KEY</code> di pengaturan Environment Variables Vercel lalu lakukan rebuild/redeploy.
            </div>
          )}

          {/* Reset Form */}
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.com"
                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                required
                disabled={!isConfigured}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !isConfigured}
              className="w-full mt-2 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Kirim Link Reset Password'
              )}
            </button>
          </form>

          {/* Back links */}
          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
              Sudah ingat password?{' '}
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                Masuk
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6 opacity-70">
          Powered by Helpora.id
        </p>
      </div>
    </motion.div>
  );
}
