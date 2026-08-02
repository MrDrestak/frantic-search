import React, { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { helpTexts } from './help-texts';

interface InfoButtonProps {
  moduleKey: string;
  id?: string;
}

const InfoButton: React.FC<InfoButtonProps> = ({ moduleKey, id }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const help = helpTexts[moduleKey];

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  if (!help) return null;

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Ayuda sobre esta sección"
        className="w-7 h-7 rounded-full flex items-center justify-center border border-slate-700/60 bg-slate-800/80 text-slate-400 hover:text-violet-400 hover:border-violet-500/50 transition-colors"
      >
        <Info size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4">
          <div className="flex justify-between items-start gap-2 mb-2">
            <h4 className="text-white font-bold text-sm">{help.title}</h4>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-500 hover:text-white transition-colors shrink-0 mt-0.5"
            >
              <X size={13} />
            </button>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">{help.text}</p>
        </div>
      )}
    </div>
  );
};

export default InfoButton;
