
import React, { useEffect, useState, useCallback } from 'react';
import { cardService, binderService, auth } from '../services/store';
import { searchCards, getCardImage, getCardPrintings } from '../services/scryfallService';
import { Card, Binder, ScryfallCard, CardCondition, BinderType } from '../types';
import MTGCard from '../components/MTGCard';
import CSVImporter from '../components/CSVImporter';
import { Search, ArrowLeft, Plus, Check, Loader2, X, Upload, ChevronRight, Layers, Trash2, AlertTriangle, DollarSign } from 'lucide-react';

interface BinderDetailProps {
  binderId: string;
  onBack: () => void;
}

const BinderDetail: React.FC<BinderDetailProps> = ({ binderId, onBack }) => {
  const [binder, setBinder] = useState<Binder | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  
  // Filter State
  const [filterText, setFilterText] = useState('');

  // Search Flow State
  const [showSearch, setShowSearch] = useState(false);
  const [searchStep, setSearchStep] = useState<'QUERY' | 'VERSIONS' | 'CONFIG'>('QUERY');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ScryfallCard[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [versionResults, setVersionResults] = useState<ScryfallCard[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  // CSV State
  const [showCSV, setShowCSV] = useState(false);
  const [importProgress, setImportProgress] = useState<{current: number, total: number} | null>(null);

  // New Card Config
  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null);
  const [condition, setCondition] = useState<CardCondition>(CardCondition.NM);
  const [isFoil, setIsFoil] = useState(false);

  // Delete Confirmation State
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Price Modal State
  const [editingPriceCard, setEditingPriceCard] = useState<Card | null>(null);
  const [priceInput, setPriceInput] = useState<string>('');
  const [currencyInput, setCurrencyInput] = useState<'USD' | 'PEN'>('USD');

  useEffect(() => {
    loadData();
  }, [binderId]);

  const loadData = async () => {
    const userBinders = await binderService.getUserBinders(auth.getCurrentUser()?.id || '');
    const currentBinder = userBinders.find(b => b.id === binderId);
    setBinder(currentBinder || null);

    const binderCards = await cardService.getCardsInBinder(binderId);
    setCards(binderCards);
  };

  // Debounced Search
  useEffect(() => {
    if (searchStep !== 'QUERY') return; // Only search in query step

    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        setIsSearching(true);
        const results = await searchCards(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, searchStep]);

  const handleCardClick = async (card: ScryfallCard) => {
      setSearchStep('VERSIONS');
      setIsLoadingVersions(true);
      // Fetch all printings of this card
      const prints = await getCardPrintings(card.oracle_id);
      setVersionResults(prints);
      setIsLoadingVersions(false);
  };

  const handleVersionSelect = (card: ScryfallCard) => {
      setSelectedCard(card);
      setSearchStep('CONFIG');
      // Auto-detect if foil only
      if (!card.prices.usd && card.prices.usd_foil) {
          setIsFoil(true);
      } else {
          setIsFoil(false);
      }
  };

  const handleBackStep = () => {
      if (searchStep === 'CONFIG') setSearchStep('VERSIONS');
      else if (searchStep === 'VERSIONS') setSearchStep('QUERY');
      else {
          setShowSearch(false);
          setSearchQuery('');
      }
  };

  const handleAddCard = async () => {
    if (!selectedCard || !binder) return;

    // Calculate Price
    const priceStr = isFoil ? selectedCard.prices.usd_foil : selectedCard.prices.usd;
    const price = priceStr ? parseFloat(priceStr) : 0;

    await cardService.addCard({
      binderId: binder.id,
      userId: binder.userId,
      scryfallId: selectedCard.id,
      name: selectedCard.name,
      setName: selectedCard.set_name,
      collectorNumber: selectedCard.collector_number,
      imageUrl: getCardImage(selectedCard),
      condition: condition,
      isFoil: isFoil,
      rarity: selectedCard.rarity,
      price: price,
      purchaseUrl: selectedCard.purchase_uris?.card_kingdom || null,
      game: binder.game // Pass the binder's game type
    });

    // Reset UI
    setSelectedCard(null);
    setSearchQuery('');
    setSearchResults([]);
    setVersionResults([]);
    setSearchStep('QUERY');
    setShowSearch(false);
    loadData();
  };

  const handleRemoveCard = async (cardId: string) => {
      // Immediate deletion, no confirmation
      await cardService.removeCard(cardId);
      loadData();
  }

  const handleToggleShowcase = async (card: Card) => {
      if (!card.id) return;
      const newState = !card.isShowcase;
      await cardService.toggleShowcase(card.id, newState);
      // Optimistic update locally
      setCards(prev => prev.map(c => c.id === card.id ? { ...c, isShowcase: newState } : c));
  }

  const handleOpenPriceModal = (card: Card) => {
      setEditingPriceCard(card);
      setPriceInput(card.customPrice ? card.customPrice.toString() : '');
      setCurrencyInput(card.currency || 'USD');
  };

  const handleSavePrice = async () => {
      if (!editingPriceCard) return;
      
      const price = parseFloat(priceInput);
      if (isNaN(price)) return; // Simple validation

      await cardService.updatePrice(editingPriceCard.id, price, currencyInput);
      
      // Optimistic Update
      setCards(prev => prev.map(c => c.id === editingPriceCard.id ? { ...c, customPrice: price, currency: currencyInput } : c));
      setEditingPriceCard(null);
  };

  const handleConfirmDeleteBinder = async () => {
      if (binder) {
        await binderService.deleteBinder(binder.id);
        setShowDeleteModal(false);
        onBack();
      }
  }

  const handleBatchImport = async (mappedRows: any[]) => {
      if (!binder) return;
      setShowCSV(false);
      setImportProgress({ current: 0, total: mappedRows.length });

      for (let i = 0; i < mappedRows.length; i++) {
          const row = mappedRows[i];
          if (!row.name) continue;

          try {
              // 1. Construct Search Query with high specificity
              const cleanName = row.name.trim();
              const cleanSet = row.set?.trim();
              const cleanCN = row.collectorNumber?.trim();

              let query = '';
              
              if (cleanSet && cleanCN) {
                 query = `set:${cleanSet} cn:${cleanCN}`;
              } else if (cleanSet) {
                 query = `!"${cleanName}" set:${cleanSet}`;
              } else {
                 query = `!"${cleanName}"`;
              }

              let results = await searchCards(query);

              if (results.length === 0) {
                  let looseQuery = cleanSet 
                      ? `${cleanName} set:${cleanSet}` 
                      : cleanName;
                  
                  results = await searchCards(looseQuery);
                  if (results.length === 0 && cleanSet) {
                      results = await searchCards(cleanName);
                  }
              }

              const match = results[0];

              if (match) {
                  let cond = CardCondition.NM;
                  const rowCond = (row.condition || '').toLowerCase();
                  if (rowCond.includes('light') || rowCond === 'lp') cond = CardCondition.LP;
                  else if (rowCond.includes('mod') || rowCond === 'mp') cond = CardCondition.MP;
                  else if (rowCond.includes('heav') || rowCond === 'hp') cond = CardCondition.HP;
                  else if (rowCond.includes('dam') || rowCond === 'dmg') cond = CardCondition.DMG;

                  const rowFoil = (row.isFoil || '').toString().toLowerCase();
                  const isFoil = rowFoil === 'true' || rowFoil === 'yes' || rowFoil === 'y' || rowFoil === 'foil';

                  const priceStr = isFoil ? match.prices.usd_foil : match.prices.usd;
                  const price = priceStr ? parseFloat(priceStr) : 0;

                  await cardService.addCard({
                      binderId: binder.id,
                      userId: binder.userId,
                      scryfallId: match.id,
                      name: match.name,
                      setName: match.set_name,
                      collectorNumber: match.collector_number,
                      imageUrl: getCardImage(match),
                      condition: cond,
                      isFoil: isFoil,
                      rarity: match.rarity,
                      price: price,
                      purchaseUrl: match.purchase_uris?.card_kingdom || null,
                      game: binder.game // Pass the binder's game type
                  });
              }
          } catch (e) {
              console.error(`Failed to import ${row.name}`, e);
          }
          
          setImportProgress({ current: i + 1, total: mappedRows.length });
          await new Promise(r => setTimeout(r, 200)); 
      }

      setImportProgress(null);
      loadData();
  };

  const filteredCards = cards.filter(card => 
    card.name.toLowerCase().includes(filterText.toLowerCase())
  );

  if (!binder) return <div className="p-8 text-white">Loading binder...</div>;

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 h-screen flex flex-col relative">
      {/* Loading Overlay for Import */}
      {importProgress && (
        <div className="fixed inset-0 bg-slate-950/90 z-[60] flex flex-col items-center justify-center p-4">
            <Loader2 size={48} className="text-violet-500 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Importing Cards...</h2>
            <div className="w-full max-w-md bg-slate-800 rounded-full h-4 overflow-hidden">
                <div 
                    className="bg-violet-600 h-full transition-all duration-300"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
            </div>
            <p className="text-slate-400 mt-2">{importProgress.current} of {importProgress.total} processed</p>
        </div>
      )}

      {/* CSV Modal */}
      {showCSV && (
          <CSVImporter 
            onClose={() => setShowCSV(false)}
            onImport={handleBatchImport}
          />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">Delete Binder?</h3>
                        <p className="text-slate-400 text-sm">
                            Are you sure you want to delete <span className="text-white font-medium">"{binder.name}"</span>? 
                            This action cannot be undone and will remove all {cards.length} cards in it.
                        </p>
                    </div>
                    <div className="flex gap-3 w-full mt-2">
                        <button 
                            onClick={() => setShowDeleteModal(false)}
                            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleConfirmDeleteBinder}
                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* My Offer Price Modal */}
      {editingPriceCard && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
                  <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-white">Set My Offer</h3>
                      <button onClick={() => setEditingPriceCard(null)} className="text-slate-400 hover:text-white">
                          <X size={20} />
                      </button>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">
                      Set the price you want for <span className="text-white font-medium">{editingPriceCard.name}</span>.
                  </p>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Currency</label>
                          <div className="grid grid-cols-2 gap-2">
                              <button 
                                type="button" 
                                onClick={() => setCurrencyInput('USD')}
                                className={`py-2 px-3 rounded border text-sm font-medium ${currencyInput === 'USD' ? 'bg-violet-600 border-violet-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-400'}`}
                              >
                                  USD ($)
                              </button>
                              <button 
                                type="button" 
                                onClick={() => setCurrencyInput('PEN')}
                                className={`py-2 px-3 rounded border text-sm font-medium ${currencyInput === 'PEN' ? 'bg-violet-600 border-violet-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-400'}`}
                              >
                                  SOL (S/)
                              </button>
                          </div>
                      </div>
                      
                      <div>
                          <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Price</label>
                          <div className="relative">
                              <div className="absolute left-3 top-2.5 text-slate-400 font-bold">
                                  {currencyInput === 'USD' ? '$' : 'S/'}
                              </div>
                              <input 
                                  type="number" 
                                  step="0.01"
                                  min="0"
                                  value={priceInput}
                                  onChange={(e) => setPriceInput(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-violet-500 outline-none text-lg font-mono"
                                  placeholder="0.00"
                                  autoFocus
                              />
                          </div>
                      </div>

                      <button 
                          onClick={handleSavePrice}
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 mt-2"
                      >
                          <DollarSign size={18} /> Save Offer
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <header className="flex items-center gap-4 flex-none">
        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            {binder.name}
            <span className={`text-xs px-2 py-0.5 rounded border ${binder.type === BinderType.WISHLIST ? 'border-pink-500 text-pink-400' : 'border-indigo-500 text-indigo-400'}`}>
                {binder.type}
            </span>
          </h1>
          <p className="text-slate-400">{cards.length} Cards collected</p>
        </div>
        <div className="ml-auto flex gap-2">
             <button 
                onClick={() => setShowDeleteModal(true)}
                className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-transparent hover:border-red-400"
                title="Delete Binder"
             >
                <Trash2 size={20} />
             </button>
             <button 
                onClick={() => setShowCSV(true)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 md:px-4 py-2 rounded-lg flex items-center gap-2 border border-slate-700 transition-colors"
             >
                <Upload size={18} /> <span className="hidden md:inline">Upload CSV</span>
             </button>
             <button 
                onClick={() => setShowSearch(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white px-3 md:px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-violet-900/20"
             >
                <Plus size={18} /> <span className="hidden md:inline">Add Card</span>
             </button>
        </div>
      </header>
      
      {/* Filter Bar */}
      <div className="flex-none">
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
             <input 
                 type="text"
                 placeholder="Filter cards by name..."
                 value={filterText}
                 onChange={(e) => setFilterText(e.target.value)}
                 className="w-full bg-slate-900/50 border border-slate-800 rounded-lg pl-10 pr-10 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 focus:outline-none transition-all"
             />
             {filterText && (
                 <button 
                    onClick={() => setFilterText('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1"
                 >
                     <X size={16} />
                 </button>
             )}
          </div>
      </div>

      {/* Add Card Wizard Overlay */}
      {showSearch && (
         <div className="fixed inset-0 bg-slate-950/95 z-50 flex flex-col p-4 md:p-8">
            <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
                <div className="flex justify-between items-center mb-6 flex-none">
                    <div className="flex items-center gap-2">
                        {searchStep !== 'QUERY' && (
                            <button onClick={handleBackStep} className="p-1 hover:bg-slate-800 rounded-full text-slate-400">
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <h2 className="text-xl md:text-2xl font-bold text-white">
                            {searchStep === 'QUERY' && "Find Cards"}
                            {searchStep === 'VERSIONS' && "Select Version"}
                            {searchStep === 'CONFIG' && "Card Details"}
                        </h2>
                    </div>
                    <button onClick={() => { setShowSearch(false); setSearchStep('QUERY'); setSearchQuery(''); setSelectedCard(null); }} className="text-slate-400 hover:text-white">
                        <X size={28} />
                    </button>
                </div>

                {/* STEP 1: QUERY */}
                {searchStep === 'QUERY' && (
                    <>
                        <div className="relative mb-6 flex-none">
                            <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                            <input 
                                type="text"
                                placeholder="Search by name (e.g. Black Lotus)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-violet-500 focus:outline-none text-lg"
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-0">
                            {isSearching && <div className="col-span-full text-center text-slate-500 py-10"><Loader2 className="animate-spin mx-auto mb-2"/>Searching Scryfall...</div>}
                            
                            {searchResults.map(card => (
                                <div 
                                    key={card.id} 
                                    onClick={() => handleCardClick(card)}
                                    className="flex gap-4 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-violet-500 cursor-pointer transition-colors group"
                                >
                                    <img src={getCardImage(card)} alt={card.name} className="w-16 h-24 object-cover rounded bg-slate-950" />
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <h4 className="font-bold text-white truncate">{card.name}</h4>
                                        <p className="text-sm text-slate-400 flex items-center gap-1">
                                            Select version <ChevronRight size={14} />
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* STEP 2: VERSIONS */}
                {searchStep === 'VERSIONS' && (
                    <div className="flex-1 overflow-y-auto min-h-0">
                        {isLoadingVersions ? (
                             <div className="text-center text-slate-500 py-20">
                                 <Loader2 className="animate-spin mx-auto mb-4" size={32}/>
                                 <p>Loading all printings...</p>
                             </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {versionResults.map(version => (
                                    <div 
                                        key={version.id} 
                                        onClick={() => handleVersionSelect(version)}
                                        className="flex gap-4 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-violet-500 cursor-pointer transition-colors group relative overflow-hidden"
                                    >
                                        <img src={getCardImage(version)} alt={version.name} className="w-20 h-28 object-cover rounded bg-slate-950 shadow-md" />
                                        <div className="flex-1 min-w-0 py-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-white truncate text-lg">{version.name}</h4>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${version.rarity === 'rare' || version.rarity === 'mythic' ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-700 text-slate-400'}`}>
                                                    {version.rarity}
                                                </span>
                                            </div>
                                            <p className="text-violet-400 font-medium text-sm mt-1">{version.set_name}</p>
                                            <div className="flex items-center gap-3 mt-auto pt-2">
                                                <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 font-mono">
                                                    {version.set.toUpperCase()} • #{version.collector_number}
                                                </span>
                                            </div>
                                            
                                            {/* Price Preview */}
                                            <div className="mt-2 text-xs text-green-400 font-mono">
                                                Est: ${version.prices.usd || version.prices.usd_foil || '---'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 3: CONFIG */}
                {searchStep === 'CONFIG' && selectedCard && (
                     <div className="flex-1 overflow-y-auto min-h-0 pb-10">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 md:p-6 flex flex-col md:flex-row gap-6 md:gap-8 animate-in fade-in zoom-in-95 duration-200 mt-2 md:mt-10">
                            <div className="flex-shrink-0 mx-auto md:mx-0">
                                <img src={getCardImage(selectedCard)} alt={selectedCard.name} className="w-48 md:w-64 rounded-xl shadow-2xl border border-slate-800" />
                            </div>
                            <div className="flex-1 space-y-6 md:space-y-8">
                                <div>
                                    <h3 className="text-2xl md:text-3xl font-bold text-white">{selectedCard.name}</h3>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-lg md:text-xl text-violet-400">{selectedCard.set_name}</span>
                                        <span className="text-sm bg-slate-800 px-2 py-1 rounded text-slate-400 font-mono border border-slate-700">
                                            #{selectedCard.collector_number}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-slate-300">Condition</label>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.values(CardCondition).map((c) => (
                                            <button 
                                                key={c}
                                                onClick={() => setCondition(c)}
                                                className={`px-3 md:px-4 py-2 rounded-lg text-sm font-medium border transition-all ${condition === c ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/50' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="checkbox" 
                                                id="foil" 
                                                checked={isFoil} 
                                                onChange={(e) => setIsFoil(e.target.checked)}
                                                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-violet-600 focus:ring-violet-500" 
                                            />
                                            <label htmlFor="foil" className="text-white cursor-pointer select-none font-medium">Foil / Special Finish</label>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-slate-400">Est. Price</div>
                                            <div className="text-xl font-bold text-green-400">
                                                ${(isFoil ? selectedCard.prices.usd_foil : selectedCard.prices.usd) || '---'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button onClick={handleAddCard} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-3 md:py-4 rounded-xl font-bold flex justify-center items-center gap-2 shadow-xl shadow-violet-900/20 text-lg transition-all hover:scale-[1.02]">
                                        <Check size={24} /> Add to Binder
                                    </button>
                                </div>
                            </div>
                        </div>
                     </div>
                )}
            </div>
         </div>
      )}

      {/* Cards Grid */}
      <div className="flex-1 overflow-y-auto pr-2 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredCards.map(card => (
                <MTGCard 
                    key={card.id} 
                    card={card} 
                    onRemove={() => handleRemoveCard(card.id)} 
                    // Only enable showcase toggling if this is a "For Trade" binder
                    enableShowcase={binder.type === BinderType.FOR_TRADE}
                    onToggleShowcase={() => handleToggleShowcase(card)}
                    onSetPrice={() => handleOpenPriceModal(card)}
                />
            ))}
            {cards.length === 0 && (
                <div className="col-span-full text-center py-20 text-slate-500">
                    <Layers className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>This binder is empty.</p>
                    <button onClick={() => setShowSearch(true)} className="text-violet-400 underline mt-2">Start adding cards</button>
                </div>
            )}
            
            {cards.length > 0 && filteredCards.length === 0 && (
                 <div className="col-span-full text-center py-12 text-slate-500">
                    <p>No cards match "{filterText}"</p>
                    <button onClick={() => setFilterText('')} className="text-violet-400 hover:text-violet-300 mt-2 text-sm font-medium">Clear Filter</button>
                 </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default BinderDetail;
