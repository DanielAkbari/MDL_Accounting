import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface Option {
  value: string;
  label: string;
  subLabel?: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchableSelect({ options, value, onChange, placeholder = 'Select...', className }: Props) {
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
    <div ref={wrapperRef} className="relative">
      <div
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 bg-zinc-100 border-none rounded-md focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer text-zinc-700 min-h-[36px]",
          className
        )}
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0 ml-2" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-md shadow-xl flex flex-col" style={{ maxHeight: '300px' }}>
          <div className="p-2 border-b border-zinc-100 sticky top-0 bg-white rounded-t-md">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-zinc-50 border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto p-1 flex-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-zinc-500 text-center">No results found</div>
            ) : (
              filteredOptions.map((o) => (
                <div
                  key={o.value}
                  className={cn(
                    "px-3 py-2 text-sm rounded cursor-pointer flex flex-col hover:bg-zinc-100",
                    value === o.value && "bg-indigo-50 text-indigo-700 font-medium"
                  )}
                  onClick={() => {
                    onChange(o.value);
                    setIsOpen(false);
                  }}
                >
                  <span>{o.label}</span>
                  {o.subLabel && <span className="text-[10px] text-zinc-500 mt-0.5">{o.subLabel}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
