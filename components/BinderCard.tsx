import React from 'react';
import { Binder, BinderType } from '../types';
import { Folder, Heart, ShoppingCart } from 'lucide-react';

interface BinderCardProps {
  binder: Binder;
  onClick: () => void;
}

const BinderCard: React.FC<BinderCardProps> = ({ binder, onClick }) => {
  const isWishlist = binder.type === BinderType.WISHLIST;
  
  return (
    <div 
      onClick={onClick}
      className="group relative aspect-[3/4] bg-slate-800 rounded-xl border border-slate-700 hover:border-violet-500/50 transition-all cursor-pointer overflow-hidden shadow-lg hover:shadow-violet-900/20"
    >
      {/* Background/Cover */}
      <div className={`absolute inset-0 bg-gradient-to-b ${isWishlist ? 'from-pink-900/20 to-slate-900' : 'from-indigo-900/20 to-slate-900'} z-0`} />
      
      <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
        <div className="flex justify-between items-start">
            <div className={`p-2 rounded-lg ${isWishlist ? 'bg-pink-500/10 text-pink-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                {isWishlist ? <Heart size={20} /> : <ShoppingCart size={20} />}
            </div>
            <span className="text-xs font-mono text-slate-500 border border-slate-700 px-2 py-0.5 rounded">
                {binder.game === 'Magic: The Gathering' ? 'MTG' : 'TCG'}
            </span>
        </div>

        <div>
            <h3 className="text-lg font-bold text-white mb-1 truncate group-hover:text-violet-300 transition-colors">
                {binder.name}
            </h3>
            <p className="text-slate-400 text-sm">
                {binder.cardCount} Cards
            </p>
        </div>
      </div>
      
      {/* Decorative binder rings */}
      <div className="absolute left-0 top-0 bottom-0 w-4 flex flex-col justify-evenly py-4 bg-slate-950/50 border-r border-slate-800">
        {[1,2,3].map(i => (
            <div key={i} className="w-full h-2 bg-slate-600 rounded-r-full mx-auto" />
        ))}
      </div>
    </div>
  );
};

export default BinderCard;