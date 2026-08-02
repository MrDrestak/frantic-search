import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { tourSteps } from './help-texts';

const TOUR_KEY = 'frantic_tour_completed';
const PAD = 7;

interface TourOverlayProps {
  onComplete: () => void;
}

const TourOverlay: React.FC<TourOverlayProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [winW, setWinW] = useState(window.innerWidth);
  const [winH, setWinH] = useState(window.innerHeight);

  const current = tourSteps[step];
  const total = tourSteps.length;

  const refreshRect = useCallback(() => {
    const el = document.getElementById(current.targetId);
    setRect(el ? el.getBoundingClientRect() : null);
    setWinW(window.innerWidth);
    setWinH(window.innerHeight);
  }, [current.targetId]);

  useEffect(() => {
    const t = setTimeout(refreshRect, 60);
    window.addEventListener('resize', refreshRect);
    return () => { clearTimeout(t); window.removeEventListener('resize', refreshRect); };
  }, [refreshRect]);

  const complete = useCallback(() => {
    localStorage.setItem(TOUR_KEY, '1');
    onComplete();
  }, [onComplete]);

  const next = () => {
    if (step + 1 >= total) complete();
    else setStep(s => s + 1);
  };

  const TOOLTIP_W = 288;
  const TOOLTIP_H = 195;
  const MARGIN = 12;

  const getTooltipStyle = (): React.CSSProperties => {
    if (!rect) {
      return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: TOOLTIP_W, zIndex: 503 };
    }
    const spotBottom = rect.bottom + PAD;
    const spotTop = rect.top - PAD;

    let top: number;
    if (winH - spotBottom >= TOOLTIP_H + MARGIN) {
      top = spotBottom + MARGIN;
    } else if (spotTop >= TOOLTIP_H + MARGIN) {
      top = spotTop - TOOLTIP_H - MARGIN;
    } else {
      top = Math.max(MARGIN, winH / 2 - TOOLTIP_H / 2);
    }

    const centerX = rect.left + rect.width / 2;
    let left = centerX - TOOLTIP_W / 2;
    left = Math.max(MARGIN, Math.min(left, winW - TOOLTIP_W - MARGIN));

    return { position: 'fixed', top, left, width: TOOLTIP_W, zIndex: 503 };
  };

  const BG = 'rgba(0,0,0,0.78)';

  return (
    <>
      {/* 4-rect overlay — leaves the spotlight area uncovered so native elements show through */}
      {rect ? (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: Math.max(0, rect.top - PAD), background: BG, zIndex: 500 }} />
          <div style={{ position: 'fixed', top: rect.top - PAD, left: 0, width: Math.max(0, rect.left - PAD), height: rect.height + PAD * 2, background: BG, zIndex: 500 }} />
          <div style={{ position: 'fixed', top: rect.top - PAD, left: rect.right + PAD, right: 0, height: rect.height + PAD * 2, background: BG, zIndex: 500 }} />
          <div style={{ position: 'fixed', top: rect.bottom + PAD, left: 0, right: 0, bottom: 0, background: BG, zIndex: 500 }} />
          {/* Spotlight glow border */}
          <div
            style={{
              position: 'fixed',
              top: rect.top - PAD,
              left: rect.left - PAD,
              width: rect.width + PAD * 2,
              height: rect.height + PAD * 2,
              border: '2px solid #a78bfa',
              borderRadius: 10,
              boxShadow: '0 0 18px rgba(167,139,250,0.5)',
              pointerEvents: 'none',
              zIndex: 501,
            }}
          />
          {/* Transparent click absorber over spotlight — prevents navigating away mid-tour */}
          <div
            style={{
              position: 'fixed',
              top: rect.top - PAD,
              left: rect.left - PAD,
              width: rect.width + PAD * 2,
              height: rect.height + PAD * 2,
              zIndex: 502,
              cursor: 'default',
            }}
            onClick={e => e.stopPropagation()}
          />
        </>
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: BG, zIndex: 500 }} />
      )}

      {/* Tooltip card */}
      <div
        style={getTooltipStyle()}
        className="bg-slate-900 border border-violet-500/40 rounded-2xl shadow-2xl p-5"
      >
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-violet-400 font-semibold tracking-wide">
            Paso {step + 1} de {total}
          </span>
          <button
            onClick={complete}
            title="Saltar tour"
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <h3 className="text-white font-bold text-[15px] mb-1.5">{current.title}</h3>
        <p className="text-slate-300 text-sm leading-relaxed mb-4">{current.text}</p>

        <div className="flex items-center gap-2">
          <button
            onClick={complete}
            className="text-slate-500 hover:text-slate-300 text-xs transition-colors px-2 py-1 shrink-0"
          >
            Saltar
          </button>
          <button
            onClick={next}
            className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            {step + 1 >= total ? 'Entendido ✓' : 'Siguiente'}
            {step + 1 < total && <ChevronRight size={14} />}
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {tourSteps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-4 bg-violet-400' : 'w-1.5 bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default TourOverlay;
