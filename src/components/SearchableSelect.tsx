import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface Option {
  value: string;
  label: string;
  subLabel?: string;
  isChild?: boolean;
  isHeader?: boolean;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  isSearchable?: boolean;
}

export function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Pilih...', 
  className,
  isSearchable = true 
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      (o.subLabel && o.subLabel.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Trigger Button */}
      <div
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-indigo-500 hover:bg-slate-100/30 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500/15 focus-within:border-indigo-500 text-xs font-semibold cursor-pointer text-slate-800 transition-all duration-150 min-h-[38px] select-none shadow-inner",
          isOpen && "border-indigo-500 bg-white ring-2 ring-indigo-500/15 shadow-sm",
          className
        )}
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : <span className="text-slate-400 font-medium">{placeholder}</span>}
        </span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-indigo-500 shrink-0 ml-2 transition-transform duration-200", isOpen && "transform rotate-180")} />
      </div>

      {/* Dropdown Menu Container */}
      {isOpen && (
        <div className="absolute z-[70] w-full mt-1 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-1.5 duration-200" style={{ maxHeight: '250px' }}>
          {/* Search bar inside menu */}
          {isSearchable && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                  placeholder="Cari..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto p-1 flex-1 min-h-0 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-xs text-slate-400 text-center italic">Tidak ditemukan hasil</div>
            ) : (
              filteredOptions.map((o) => {
                const isSelected = value === o.value;
                return (
                  <div
                    key={o.value}
                    className={cn(
                      "px-3 py-2 text-[11px] rounded-lg cursor-pointer flex items-center justify-between transition-colors duration-100 hover:bg-indigo-50/50 hover:text-indigo-900 group select-none",
                      o.isHeader ? "font-extrabold text-slate-900 bg-slate-50/40" : "font-medium text-slate-700",
                      o.isChild && "pl-6 text-slate-500 font-normal",
                      isSelected && "bg-indigo-50 text-indigo-700 font-extrabold"
                    )}
                    onClick={() => {
                      onChange(o.value);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{o.label}</span>
                      {o.subLabel && <span className="text-[9px] text-slate-400 mt-0.5 group-hover:text-indigo-900/50 font-normal">{o.subLabel}</span>}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-2" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
