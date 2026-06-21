import React, { useState, useEffect, useRef } from 'react';
import { Transaction } from '../types';
import { getMergedCOA } from '../data/coa';
import { Sparkles, Send, Trash2, HelpCircle, ArrowRight, Bot, User, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

interface FintraxAIProps {
  transactions: Transaction[];
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
}

// Custom parser sederhana untuk menerjemahkan Markdown terbatas (headers, lists, bold, inline code) ke React nodes
const formatInlineText = (text: string): React.ReactNode[] => {
  // Split untuk bold **bold**
  const boldParts = text.split(/(\*\*.*?\*\*)/g);
  return boldParts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-bold text-slate-900 dark:text-slate-800">{part.slice(2, -2)}</strong>;
    }
    // Split untuk inline code `code`
    const codeParts = part.split(/(`.*?`)/g);
    if (codeParts.length > 1) {
      return codeParts.map((cp, idx) => {
        if (cp.startsWith('`') && cp.endsWith('`')) {
          return (
            <code key={idx} className="bg-slate-100 border border-slate-200 px-1 py-0.5 rounded font-mono text-[10px] text-emerald-600 font-bold whitespace-nowrap">
              {cp.slice(1, -1)}
            </code>
          );
        }
        return cp;
      }) as any;
    }
    return part;
  });
};

const formatMessageContent = (text: string): React.ReactNode => {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-xs text-slate-700 leading-relaxed text-left">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={i} className="h-2" />;
        }

        // Heading 3: ### Title
        if (line.startsWith('### ')) {
          return (
            <h4 key={i} className="text-xs font-black text-slate-900 mt-3 mb-1 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1 h-3 bg-emerald-500 rounded-full inline-block"></span>
              {formatInlineText(line.substring(4))}
            </h4>
          );
        }
        // Heading 2: ## Title
        if (line.startsWith('## ')) {
          return (
            <h3 key={i} className="text-sm font-black text-slate-900 mt-4 mb-1.5 border-b border-slate-100 pb-1 flex items-center gap-2">
              <span>✨</span>
              {formatInlineText(line.substring(3))}
            </h3>
          );
        }
        // Heading 1: # Title
        if (line.startsWith('# ')) {
          return (
            <h2 key={i} className="text-md font-extrabold text-slate-900 mt-5 mb-2 flex items-center gap-2">
              {formatInlineText(line.substring(2))}
            </h2>
          );
        }
        // Bullet List: - item atau * item
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex items-start gap-1.5 pl-2 my-0.5">
              <span className="text-emerald-500 text-[10px] select-none mt-0.5">•</span>
              <span className="flex-1">{formatInlineText(line.substring(2))}</span>
            </div>
          );
        }

        // Baris teks biasa
        return <p key={i}>{formatInlineText(line)}</p>;
      })}
    </div>
  );
};

export default function FintraxAI({ transactions, initialPrompt, onClearInitialPrompt }: FintraxAIProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedChat = localStorage.getItem('fintrax_ai_chat_history');
    if (savedChat) {
      try {
        setMessages(JSON.parse(savedChat));
      } catch (e) {
        console.error('Failed to load chat history:', e);
      }
    }
  }, []);

  // Save chat history to localStorage whenever messages change
  const saveChatHistory = (updatedMessages: Message[]) => {
    setMessages(updatedMessages);
    localStorage.setItem('fintrax_ai_chat_history', JSON.stringify(updatedMessages));
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle initialPrompt triggered from other components
  useEffect(() => {
    if (initialPrompt) {
      sendMessage(initialPrompt);
      if (onClearInitialPrompt) {
        onClearInitialPrompt();
      }
    }
  }, [initialPrompt]);

  const quickPrompts = [
    {
      label: '📊 Analisis Finansial Umum',
      text: 'Bagaimana kondisi performa keuangan perusahaan secara umum berdasarkan transaksi terkini?',
    },
    {
      label: '🌴 Profit Proyek Pariwisata',
      text: 'Berapa total keuntungan bersih dari proyek Pariwisata dan apa pengeluaran terbesarnya?',
    },
    {
      label: '🏡 Rasio Kas Properti',
      text: 'Bagaimana kondisi arus kas masuk dan keluar untuk proyek Properti?',
    },
    {
      label: '🔍 Cek Potensi Anomali',
      text: 'Apakah ada anomali pembukuan, transaksi mencurigakan, atau data yang tidak konsisten pada riwayat transaksi?',
    },
  ];

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    // Tambahkan pesan user ke state
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...messages, userMsg];
    saveChatHistory(updatedHistory);
    setInputMessage('');
    setIsLoading(true);

    try {
      const coaList = getMergedCOA();
      
      // Ambil history percakapan terformat untuk dikirim ke backend
      const formattedHistory = messages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          history: formattedHistory,
          transactions: transactions,
          coaList: coaList,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal terhubung dengan FintraxAI');
      }

      const modelMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'model',
        text: data.text,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      saveChatHistory([...updatedHistory, modelMsg]);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Terjadi kesalahan saat memproses pesan');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (confirm('Apakah Anda yakin ingin menghapus semua riwayat obrolan dengan FintraxAI?')) {
      setMessages([]);
      localStorage.removeItem('fintrax_ai_chat_history');
      toast.success('Riwayat chat berhasil dibersihkan');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-50/50 rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm backdrop-blur-sm animate-in fade-in duration-300">
      
      {/* Header */}
      <header className="px-5 py-3.5 bg-white border-b border-slate-200/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-inner">
            <Sparkles className="w-5 h-5 text-indigo-500 drop-shadow-[0_0_4px_rgba(99,102,241,0.4)] animate-pulse" />
          </div>
          <div className="text-left">
            <h2 className="text-sm font-black text-slate-800 tracking-tight font-['Space_Grotesk'] flex items-center gap-1.5">
              FintraxAI
              <span className="inline-block px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-[9px] text-emerald-600 font-extrabold tracking-widest uppercase">ONLINE</span>
            </h2>
            <p className="text-[10px] text-slate-400 font-medium">Asisten Analitik Finansial berbasis Gemini 2.5 Flash</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border-0 bg-transparent cursor-pointer flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
            title="Hapus Obrolan"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </header>

      {/* Chat Messages Panel */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30">
        {messages.length === 0 ? (
          /* Empty State / Welcome Screen */
          <div className="max-w-md mx-auto text-center py-8 space-y-6">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-50 to-emerald-50 border border-slate-100 rounded-3xl flex items-center justify-center shadow-md mx-auto relative group">
              <div className="absolute inset-0 rounded-3xl bg-indigo-500/10 blur-[8px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Sparkles className="w-8 h-8 text-indigo-500 relative z-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-md font-black text-slate-800 font-['Space_Grotesk']">Selamat datang di FintraxAI!</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                Saya adalah asisten keuangan pintar Anda. Saya memiliki akses ke data transaksi dan CoA bisnis Anda untuk membantu melakukan analisis, ramalan keuangan, dan mengecek anomali jurnal.
              </p>
            </div>

            {/* Quick Prompts Container */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left pl-1">Rekomendasi Pertanyaan</p>
              <div className="grid grid-cols-1 gap-2">
                {quickPrompts.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(qp.text)}
                    className="group flex items-center justify-between p-3 bg-white hover:bg-indigo-50/40 border border-slate-200/80 hover:border-indigo-200 rounded-xl transition-all duration-200 text-left cursor-pointer shadow-sm active:scale-[0.99]"
                  >
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors flex-1 pr-2">
                      {qp.label}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Messages List */
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg) => {
              const isAi = msg.role === 'model';
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3 animate-in fade-in duration-200",
                    isAi ? "justify-start" : "justify-end"
                  )}
                >
                  {/* AI Avatar */}
                  {isAi && (
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <Bot className="w-4 h-4 text-indigo-500" />
                    </div>
                  )}

                  <div className="max-w-[85%] flex flex-col gap-1">
                    {/* Bubble */}
                    <div
                      className={cn(
                        "px-4 py-3 rounded-2xl shadow-sm text-xs border",
                        isAi 
                          ? "bg-white text-slate-700 border-slate-200/80 rounded-tl-sm" 
                          : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 rounded-tr-sm shadow-[0_2px_8px_rgba(37,99,235,0.15)]"
                      )}
                    >
                      {isAi ? (
                        formatMessageContent(msg.text)
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed text-left font-medium">{msg.text}</p>
                      )}
                    </div>

                    {/* Timestamp */}
                    <span className={cn(
                      "text-[9px] text-slate-400 font-bold px-1 uppercase tracking-wide",
                      isAi ? "text-left" : "text-right"
                    )}>
                      {isAi ? `FintraxAI • ${msg.timestamp}` : `Anda • ${msg.timestamp}`}
                    </span>
                  </div>

                  {/* User Avatar */}
                  {!isAi && (
                    <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* AI Typing Indicator */}
            {isLoading && (
              <div className="flex gap-3 justify-start animate-pulse">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="bg-white text-slate-500 border border-slate-200/80 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5 h-9 shrink-0">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">FintraxAI berpikir...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Form Footer */}
      <footer className="p-4 bg-white border-t border-slate-200/60 shrink-0">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(inputMessage);
            }}
            className="flex items-center gap-2 relative bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-inner focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all duration-150"
          >
            <input
              type="text"
              placeholder={isLoading ? "Mohon tunggu..." : "Tanyakan sesuatu tentang keuangan bisnis Anda..."}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
              maxLength={800}
              className="flex-1 bg-transparent border-0 outline-none text-xs text-slate-800 placeholder-slate-400 px-3 py-2 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="w-8.5 h-8.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 flex items-center justify-center transition-all cursor-pointer border-0 active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="flex justify-between items-center px-1 mt-2 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
            <span>🛡️ Data dianalisis secara privat</span>
            <span>{inputMessage.length}/800 karakter</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
