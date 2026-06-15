
import React from 'react';
import { Binder, BinderType } from '../types';
import { Heart, Store, Gavel, Share2 } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface BinderCardProps {
  binder: Binder;
  onClick: () => void;
  onShare?: () => void;
}

const BinderCard: React.FC<BinderCardProps> = ({ binder, onClick, onShare }) => {
  const { t } = useTranslation();
  const isWishlist = binder.type === BinderType.WISHLIST;
  const isAuction = binder.type === BinderType.AUCTION;
  
  return (
    <div 
      onClick={onClick}
      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-800/80 hover:border-slate-700 transition-all group shadow-sm relative"
    >
      <div className={`p-4 rounded-xl flex items-center justify-center shadow-lg ${
          isWishlist ? 'bg-pink-500/10 text-pink-500 shadow-pink-900/10' : 
          isAuction ? 'bg-amber-500/10 text-amber-500 shadow-amber-900/10' :
          'bg-cyan-500/10 text-cyan-500 shadow-cyan-900/10'
      }`}>
        {isWishlist ? <Heart size={32} /> : isAuction ? <Gavel size={32} /> : <Store size={32} />}
      </div>
      
      <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
            MTG {isWishlist && '• Wishlist'}
          </span>
          <h3 className="text-lg font-bold text-slate-100 group-hover:text-white transition-colors truncate">
              {binder.name}
          </h3>
          <span className="text-sm font-medium text-slate-400">
              {t('binders.cardCount', { count: binder.cardCount || 0 })}
          </span>
      </div>

      {onShare && (
          <button 
              onClick={(e) => {
                  e.stopPropagation();
                  onShare();
              }}
              className="p-2.5 bg-slate-800 text-slate-400 hover:text-white hover:bg-violet-600 rounded-lg transition-colors border border-slate-700 z-10"
              title="Share Binder"
          >
              <Share2 size={18} />
          </button>
      )}
    </div>
  );
};

export default BinderCard;
