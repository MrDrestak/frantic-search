
import React from 'react';
import { Card } from '../types';
import { Sparkles, X, Star, Link, DollarSign } from 'lucide-react';

interface MTGCardProps {
  card: Card;
  onRemove?: () => void;
  onToggleShowcase?: () => void;
  onSetPrice?: () => void;
  enableShowcase?: boolean;
}

const MTGCard: React.FC<MTGCardProps> = ({ card, onRemove, onToggleShowcase, onSetPrice, enableShowcase }) => {
  
  const handleCKLink = (e: React.MouseEvent) => {
      e.stopPropagation();
      // If we have a saved URL (from new imports), use it.
      if (card.purchaseUrl) {
          window.open(card.purchaseUrl, '_blank');
      } else {
          // Fallback search for older cards
          const searchUrl = `https://www.cardkingdom.com/catalog/search?search=header&filter%5Bname%5D=${encodeURIComponent(card.name)}`;
          window.open(searchUrl, '_blank');
      }
  };

  const quantity = card.quantity || 1;

  return (
    <div className="flex flex-col gap-1">
      <div className="relative group perspective-1000">
        <div className={`relative aspect-[2.5/3.5] rounded-lg overflow-hidden transition-transform duration-300 group-hover:scale-105 shadow-xl ${card.isFoil ? 'ring-2 ring-rainbow' : ''} ${card.isShowcase ? 'ring-2 ring-amber-400 shadow-amber-500/50' : ''}`}>
          <img 
              src={card.imageUrl} 
              alt={card.name} 
              className="w-full h-full object-cover bg-slate-900" 
              loading="lazy"
          />
          
          {/* Quantity Badge */}
          {quantity > 1 && (
              <div className="absolute bottom-2 right-2 z-30 bg-black/80 backdrop-blur text-white text-[10px] md:text-xs font-black px-1.5 py-0.5 rounded border border-white/20 shadow-lg group-hover:scale-110 transition-transform">
                  x{quantity}
              </div>
          )}

          {/* Foil Shine Effect */}
          {card.isFoil && (
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none mix-blend-overlay transition-opacity" />
          )}
          
          {/* Showcase Icon Badge */}
          {card.isShowcase && (
              <div className="absolute top-2 right-2 z-20 text-amber-400 drop-shadow-md">
                  <Star fill="currentColor" size={20} />
              </div>
          )}

          {/* Price Tag (Prioritize Custom Price) */}
          <div className="absolute top-2 left-2 z-20 flex flex-col items-start gap-1">
              {card.customPrice && card.customPrice > 0 ? (
                  <div className="bg-violet-600 text-white text-[10px] md:text-xs font-bold px-2 py-1 rounded shadow-lg border border-violet-400 flex items-center gap-1">
                    {card.currency === 'PEN' ? 'S/' : '$'} {card.customPrice.toFixed(2)}
                  </div>
              ) : (
                  card.price && card.price > 0 && (
                     <div className="bg-slate-900/80 backdrop-blur text-green-400 text-[10px] md:text-xs font-bold px-2 py-0.5 rounded shadow-sm border border-slate-700/50 flex items-center gap-1">
                        <span className="text-slate-400 text-[8px] uppercase">Est</span>
                        ${card.price.toFixed(2)}
                     </div>
                  )
              )}
          </div>

          {/* Overlay Info */}
          <div className="absolute bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-sm p-2 transform translate-y-full group-hover:translate-y-0 transition-transform z-20">
              <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-white truncate w-3/4">{card.name}</span>
                  {card.isFoil && <Sparkles size={12} className="text-yellow-400" />}
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-300">
                  <span className="uppercase bg-slate-700 px-1 rounded">{card.condition}</span>
                  <span className="uppercase">{card.setName}</span>
              </div>
          </div>
        </div>
      </div>
      
      {/* Action Bar */}
      <div className="flex gap-1 mt-1">
          {onRemove && (
             <button 
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                title="Remove Card"
                className="bg-slate-800 hover:bg-red-900/40 hover:text-red-400 text-slate-500 text-xs py-1.5 px-2 rounded flex items-center justify-center transition-colors border border-slate-700 hover:border-red-800 flex-1"
             >
                <X size={14} />
             </button>
          )}

          {/* Card Kingdom Link (Always Available) */}
          <button
              type="button"
              onClick={handleCKLink}
              title="Buy on Card Kingdom"
              className="bg-slate-800 hover:bg-orange-900/40 hover:text-orange-400 text-slate-500 text-xs py-1.5 px-2 rounded flex items-center justify-center transition-colors border border-slate-700 hover:border-orange-800 flex-1"
          >
              <Link size={14} />
          </button>
          
          {/* My Offer / Showcase Buttons (Only for Trade Binders) */}
          {enableShowcase && (
            <>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onSetPrice) onSetPrice();
                    }}
                    title="Set My Offer"
                    className={`flex-1 text-xs py-1.5 px-2 rounded flex items-center justify-center transition-colors border ${card.customPrice ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-green-200 hover:border-green-700'}`}
                >
                     <DollarSign size={14} />
                </button>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleShowcase) onToggleShowcase();
                    }}
                    title={card.isShowcase ? "Remove from Showcase" : "Add to Showcase"}
                    className={`flex-1 text-xs py-1.5 px-2 rounded flex items-center justify-center transition-colors border ${card.isShowcase ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 hover:bg-amber-500/20' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-amber-200 hover:border-amber-700'}`}
                >
                    <Star size={14} fill={card.isShowcase ? "currentColor" : "none"} /> 
                </button>
            </>
          )}
      </div>
    </div>
  );
};

export default MTGCard;
