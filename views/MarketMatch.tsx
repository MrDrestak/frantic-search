
import React, { useEffect, useState, useMemo } from 'react';
import { matchingService, auth, tradeService } from '../services/store';
import { MatchResult, Card } from '../types';
import { MessageCircle, MapPin, AlertTriangle, ChevronDown, ChevronUp, Star, CheckCircle, Clock } from 'lucide-react';
import PremiumLoading from '../components/PremiumLoading';
import { motion } from 'framer-motion';
import { useTranslation } from '../i18n/useTranslation';

interface MarketMatchProps {
    onViewProfile: (userId: string) => void;
}

type ContactState = 'none' | 'opened' | 'marked';

interface RenderMatchCardProps {
    match: MatchResult;
    isExact: boolean;
    onViewProfile: (id: string) => void;
    onContact: (m: MatchResult) => void;
    onMarkContacted: (m: MatchResult) => void;
    contactState: ContactState;
}

const RenderMatchCard: React.FC<RenderMatchCardProps> = ({ match, isExact, onViewProfile, onContact, onMarkContacted, contactState }) => {
  const { t } = useTranslation();
  return (
    <div className={`bg-slate-900 border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center hover:border-violet-500/30 transition-colors ${isExact ? 'border-green-500/30 bg-green-950/10' : 'border-slate-800'}`}>
         {/* Card Info */}
         <div className="flex gap-4 items-center flex-1">
             <img 
                  src={match.matchCard.imageUrl} 
                  alt={match.matchCard.name}
                  className="w-14 h-20 rounded object-cover bg-black"
             />
             <div>
                 <div className="flex items-center gap-2">
                     <h3 className="font-bold text-white text-base">{match.matchCard.name}</h3>
                     {match.matchCard.isFoil && <span className="bg-rainbow text-transparent bg-clip-text text-[10px] font-bold border border-yellow-500/30 px-1 rounded">FOIL</span>}
                 </div>
                 <p className={`text-sm ${isExact ? 'text-green-400 font-medium' : 'text-slate-400'}`}>
                     {match.matchCard.setName}
                 </p>
                 <div className="mt-1 flex gap-2 items-center">
                     <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded uppercase">{match.matchCard.condition}</span>
                     
                     {/* Price Display */}
                     {match.matchCard.customPrice && match.matchCard.customPrice > 0 ? (
                          <span className="text-[10px] bg-green-900/40 text-green-400 px-1.5 py-0.5 rounded border border-green-800 font-bold">
                              {t('market.askLabel')} {match.matchCard.currency === 'PEN' ? 'S/' : '$'} {match.matchCard.customPrice.toFixed(2)}
                          </span>
                     ) : (
                          match.matchCard.price && match.matchCard.price > 0 && (
                              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/50">
                                  {t('market.estLabel')} ${match.matchCard.price.toFixed(2)}
                              </span>
                          )
                     )}
                 </div>
             </div>
         </div>

         {/* Seller Info */}
         <div className="w-full md:w-56 bg-slate-950 rounded-lg p-3 border border-slate-800 shrink-0">
              <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                          {match.seller.displayName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                          <button 
                              onClick={() => onViewProfile(match.seller.id)}
                              className="text-sm font-bold text-white hover:text-violet-400 hover:underline text-left truncate block"
                          >
                              {match.seller.displayName}
                          </button>
                      </div>
                  </div>
                  {/* Trader Score Badge */}
                  <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-500/20">
                      <Star size={10} fill="currentColor" />
                      {match.seller.traderScore}
                  </div>
              </div>
              
              {match.seller.preferredStore && (
                  <p className="text-[10px] text-slate-500 flex items-center gap-1 mb-2">
                      <MapPin size={10} /> {match.seller.preferredStore}
                  </p>
              )}

              {contactState === 'none' && (
                  <button
                      onClick={() => onContact(match)}
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors"
                  >
                      <MessageCircle size={14} /> {t('market.contactButton')}
                  </button>
              )}
              {contactState === 'opened' && (
                  <button
                      onClick={() => onMarkContacted(match)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors"
                  >
                      <CheckCircle size={14} /> {t('market.marcarContactado')}
                  </button>
              )}
              {contactState === 'marked' && (
                  <div className="w-full bg-slate-800/60 text-slate-500 text-xs font-bold py-2 rounded flex items-center justify-center gap-2 border border-slate-700 cursor-default">
                      <Clock size={14} /> {t('market.feedbackPendiente')}
                  </div>
              )}
         </div>
    </div>
  );
};

const MarketMatch: React.FC<MarketMatchProps> = ({ onViewProfile }) => {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [contactedMatchIds, setContactedMatchIds] = useState<Set<string>>(new Set());
  const [markedMatchIds, setMarkedMatchIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    setLoading(true);
    const user = auth.getCurrentUser();
    try {
        if (user) {
            const results = await matchingService.findMatches(user.id);
            setMatches(results);
        }
    } catch (e) {
        console.error("Match error", e);
    } finally {
        setTimeout(() => setLoading(false), 800);
    }
  };

  const handleContact = (match: MatchResult) => {
      if (match.seller.whatsapp) {
          const text = `¡Hola! Vi que tienes ${match.matchCard.name} disponible en Frantic Search. ¿Sigue disponible?`;
          window.open(`https://wa.me/${match.seller.whatsapp}?text=${encodeURIComponent(text)}`, '_blank');
          setContactedMatchIds(prev => new Set([...prev, match.matchCard.id]));
      } else {
          onViewProfile(match.seller.id);
      }
  };

  const handleMarkContacted = (match: MatchResult) => {
      setMarkedMatchIds(prev => new Set([...prev, match.matchCard.id]));
      tradeService.logInteraction(
          match.seller.id,
          match.seller.displayName,
          match.matchCard.name,
          match.matchCard.id,
          match.matchCard.binderId,
      ).catch(e => console.error('[handleMarkContacted]', e));
  };

  const getContactState = (matchCardId: string): ContactState => {
      if (markedMatchIds.has(matchCardId)) return 'marked';
      if (contactedMatchIds.has(matchCardId)) return 'opened';
      return 'none';
  };

  const groupedMatches = useMemo(() => {
      const groups = new Map<string, { wantCard: Card, exact: MatchResult[], loose: MatchResult[] }>();
      matches.forEach(m => {
          const key = m.card.id;
          if (!groups.has(key)) groups.set(key, { wantCard: m.card, exact: [], loose: [] });
          const group = groups.get(key)!;
          if (m.matchType === 'EXACT') group.exact.push(m);
          else group.loose.push(m);
      });
      return Array.from(groups.values());
  }, [matches]);

  const toggleGroup = (id: string) => {
      const next = new Set(expandedGroups);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setExpandedGroups(next);
  }

  if (loading) {
    return <PremiumLoading text="Buscando en el multiverso" subtext="Rastreando colecciones..." color="indigo" />;
  }

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24">
       <header>
          <h1 className="text-2xl font-bold text-white">{t('market.title')}</h1>
          <p className="text-slate-400">{t('market.subtitle')}</p>
       </header>

       {groupedMatches.length === 0 ? (
           <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
               <h3 className="text-xl text-white mb-2">{t('market.noMatchesTitle')}</h3>
               <p className="text-slate-400">{t('market.noMatchesDesc')}</p>
           </div>
       ) : (
           <div className="space-y-8">
               {groupedMatches.map((group) => {
                   const hasExact = group.exact.length > 0;
                   const hasLoose = group.loose.length > 0;
                   const isExpanded = expandedGroups.has(group.wantCard.id);

                   return (
                       <div key={group.wantCard.id} className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                           <div className="flex items-center gap-3 mb-2 px-2">
                                <div className="relative">
                                    <img src={group.wantCard.imageUrl} className="w-8 h-12 rounded object-cover border border-slate-700 opacity-60 grayscale" alt="" />
                                </div>
                                <div>
                                    <h3 className="text-slate-300 font-medium text-sm">{t('market.youWant')} <span className="text-white font-bold">{group.wantCard.name}</span></h3>
                                    <p className="text-xs text-slate-500">{group.wantCard.setName} (Your Version)</p>
                                </div>
                           </div>
                           
                           {hasExact && (
                               <>
                                   {group.exact.map(m => (
                                       <RenderMatchCard
                                            key={m.matchCard.id}
                                            match={m}
                                            isExact={true}
                                            onViewProfile={onViewProfile}
                                            onContact={handleContact}
                                            onMarkContacted={handleMarkContacted}
                                            contactState={getContactState(m.matchCard.id)}
                                       />
                                   ))}
                                   {hasLoose && (
                                       <div className="text-center">
                                           <button onClick={() => toggleGroup(group.wantCard.id)} className="text-xs text-slate-500 hover:text-white flex items-center justify-center gap-1 mx-auto py-2 transition-colors">
                                               {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                               {isExpanded ? 'Hide' : 'View'} {group.loose.length} other version{group.loose.length !== 1 && 's'} available
                                           </button>
                                       </div>
                                   )}
                                   {isExpanded && hasLoose && (
                                        <div className="pl-4 md:pl-8 border-l-2 border-slate-800 space-y-3 mt-2">
                                            {group.loose.map(m => (
                                                <RenderMatchCard
                                                    key={m.matchCard.id}
                                                    match={m}
                                                    isExact={false}
                                                    onViewProfile={onViewProfile}
                                                    onContact={handleContact}
                                                    onMarkContacted={handleMarkContacted}
                                                    contactState={getContactState(m.matchCard.id)}
                                                />
                                            ))}
                                        </div>
                                   )}
                               </>
                           )}
                           {!hasExact && hasLoose && (
                               <div className="space-y-3">
                                   <div className="bg-amber-900/10 border border-amber-500/20 rounded-lg p-3 flex items-center gap-3">
                                       <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                                       <p className="text-sm text-amber-200/80">
                                           Exact match not found. Showing <b>{group.loose.length}</b> similar cards from other sets.
                                       </p>
                                   </div>
                                   {group.loose.map(m => (
                                       <RenderMatchCard
                                            key={m.matchCard.id}
                                            match={m}
                                            isExact={false}
                                            onViewProfile={onViewProfile}
                                            onContact={handleContact}
                                            onMarkContacted={handleMarkContacted}
                                            contactState={getContactState(m.matchCard.id)}
                                       />
                                   ))}
                               </div>
                           )}
                       </div>
                   );
               })}
           </div>
       )}
    </div>
  );
};

export default MarketMatch;
