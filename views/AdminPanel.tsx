
import React, { useState, useEffect } from 'react';
/* Added AlertCircle to lucide-react imports */
import { ArrowLeft, Save, Loader2, ShieldAlert, Trash2, UserCheck, Crown, Layers, Heart, Gavel, DollarSign, Bell, Clock, FileText, Plus, ExternalLink, X, MapPin, Link, Send, CreditCard, UserPlus, AlertCircle } from 'lucide-react';
import { configService, auth, adminService, newsService, storeDirectoryService } from '../services/store';
import { oneSignalService } from '../services/onesignalService';
import { GlobalConfig, SubscriptionTier, TierLimits, SystemConfig, NewsItem, StoreProfile, GameType, BinderType, AuctionStatus, TradeInteraction, FeedbackValue } from '../types';
import { db } from '../services/firebase';

interface AdminPanelProps {
    onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<'SYSTEM' | 'USERS' | 'NEWS' | 'STORES' | 'NOTIFICATIONS' | 'DISPUTES'>('SYSTEM');
    const [user] = useState(auth.getCurrentUser());
    
    // Ensure admin access
    if (!user?.isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
                <ShieldAlert size={64} className="text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                <p className="text-slate-400 mb-6">You do not have administrative privileges.</p>
                <button onClick={onBack} className="text-violet-400 hover:text-white underline">
                    Return to App
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6 pb-24">
            <header className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        Admin Control Panel <ShieldAlert size={20} className="text-red-500" />
                    </h1>
                    <p className="text-slate-400">Manage system, users, content, and partners.</p>
                </div>
            </header>

            {/* TABS */}
            <div className="flex border-b border-slate-800 overflow-x-auto">
                {[
                    { id: 'SYSTEM', label: 'System Config' },
                    { id: 'USERS', label: 'User Management' },
                    { id: 'NEWS', label: 'News Manager' },
                    { id: 'STORES', label: 'Store Directory' },
                    { id: 'NOTIFICATIONS', label: 'Push Notifications' },
                    { id: 'DISPUTES', label: 'Disputas' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                            activeTab === tab.id 
                            ? 'border-violet-500 text-white' 
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* CONTENT */}
            <div className="min-h-[400px]">
                {activeTab === 'SYSTEM' && <SystemConfigTab />}
                {activeTab === 'USERS' && <UserManagementTab />}
                {activeTab === 'NEWS' && <NewsManagerTab />}
                {activeTab === 'STORES' && <StoreManagerTab />}
                {activeTab === 'NOTIFICATIONS' && <NotificationsTab />}
                {activeTab === 'DISPUTES' && <DisputesTab />}
            </div>
        </div>
    );
};

// --- SUB COMPONENTS ---

const NotificationsTab = () => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [targetType, setTargetType] = useState<'ALL' | 'WISHLIST' | 'BIDDERS'>('ALL');
    const [isSending, setIsSending] = useState(false);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) return;

        if (!confirm(`Are you sure you want to send this push notification to ${targetType} users?`)) return;

        setIsSending(true);
        try {
            let userIds: string[] | undefined = undefined;

            if (targetType === 'WISHLIST') {
                // Fetch all users who have at least one wishlist binder
                const snap = await db.collection('binders').where('type', '==', BinderType.WISHLIST).get();
                const ids = new Set<string>();
                snap.docs.forEach(doc => ids.add(doc.data().userId));
                userIds = Array.from(ids);
                if (userIds.length === 0) {
                    alert("No users found with Wishlists.");
                    setIsSending(false);
                    return;
                }
            } else if (targetType === 'BIDDERS') {
                // Fetch all unique users who are top bidders on any active auction
                const snap = await db.collection('cards')
                    .where('binderType', '==', BinderType.AUCTION)
                    .where('auctionStatus', '==', AuctionStatus.ACTIVE)
                    .get();
                
                const ids = new Set<string>();
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.topBidderId) ids.add(data.topBidderId);
                });
                userIds = Array.from(ids);
                if (userIds.length === 0) {
                    alert("No active bidders found.");
                    setIsSending(false);
                    return;
                }
            }

            await oneSignalService.sendNotification(title, message, userIds);
            alert(`Notification sent successfully${userIds ? ` to ${userIds.length} users` : ''}!`);
            setTitle('');
            setMessage('');
        } catch (error: any) {
            console.error(error);
            alert("Failed to send notification: " + error.message);
        }
        setIsSending(false);
    };

    return (
        <div className="max-w-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Bell size={20} className="text-violet-500" /> Send Push Notification
            </h3>
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <form onSubmit={handleSend} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Notification Title</label>
                        <input 
                            type="text" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-violet-500 outline-none"
                            placeholder="e.g. New Binders Available!"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Message Content</label>
                        <textarea 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-violet-500 outline-none h-24 resize-none"
                            placeholder="e.g. Check out the latest trades added by top users..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Target Audience</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() => setTargetType('ALL')}
                                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                                    targetType === 'ALL'
                                    ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600'
                                }`}
                            >
                                All Users
                            </button>
                            <button
                                type="button"
                                onClick={() => setTargetType('WISHLIST')}
                                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                                    targetType === 'WISHLIST'
                                    ? 'bg-pink-600/20 border-pink-500 text-pink-300'
                                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600'
                                }`}
                            >
                                Active Wishlist
                            </button>
                            <button
                                type="button"
                                onClick={() => setTargetType('BIDDERS')}
                                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                                    targetType === 'BIDDERS'
                                    ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600'
                                }`}
                            >
                                Active Bidders
                            </button>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button 
                            type="submit" 
                            disabled={isSending}
                            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                            Send Notification
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const SystemConfigTab = () => {
    const [config, setConfig] = useState<GlobalConfig | null>(null);
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            const data = await configService.loadConfig();
            const sysData = configService.getSystemConfig();
            setConfig(data);
            setSysConfig(sysData);
            setIsLoading(false);
        };
        load();
    }, []);

    const handleSave = async () => {
        if (!config || !sysConfig) return;
        setIsSaving(true);
        try {
            await configService.updateConfig(config);
            await configService.updateSystemConfig(sysConfig);
            alert("Settings saved successfully.");
        } catch (e) {
            alert("Failed to save.");
        }
        setIsSaving(false);
    };

    const handleChange = (tier: SubscriptionTier, field: keyof TierLimits, value: string) => {
        if (!config) return;
        setConfig(prev => {
            if (!prev) return null;
            let finalValue: string | number = value;
            if (field !== 'currency' && field !== 'paymentLink') finalValue = value === '' ? 0 : parseFloat(value);
            return { ...prev, [tier]: { ...prev[tier], [field]: finalValue } };
        });
    };

    if (isLoading || !config || !sysConfig) return <div className="text-center py-10"><Loader2 className="animate-spin mx-auto"/></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold">
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save Changes
                </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Clock size={20} className="text-blue-500" /> Trade Verification Logic
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-slate-300 block mb-1">Minimum Wait (Hours)</label>
                        <input type="number" value={sysConfig.minTradeConfirmHours} onChange={(e) => setSysConfig({...sysConfig, minTradeConfirmHours: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none"/>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-300 block mb-1">Maximum Window (Hours)</label>
                        <input type="number" value={sysConfig.maxTradeConfirmHours} onChange={(e) => setSysConfig({...sysConfig, maxTradeConfirmHours: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none"/>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {Object.values(SubscriptionTier).map((tier) => (
                    <div key={tier} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                         <div className={`px-6 py-4 flex justify-between items-center ${tier === SubscriptionTier.MYTHIC ? 'bg-purple-900/20' : 'bg-slate-950'}`}>
                             <div className="flex items-center gap-3">
                                 {tier === SubscriptionTier.MYTHIC && <Crown className="text-purple-500" size={24} />}
                                 <h2 className="text-xl font-bold text-white">{tier} Tier</h2>
                             </div>
                             <div className="flex items-center gap-2 bg-slate-950 rounded-lg p-1.5 border border-slate-700">
                                 <DollarSign size={16} className="text-green-500 ml-2" />
                                 <input type="number" value={config[tier].pricePerMonth} onChange={(e) => handleChange(tier, 'pricePerMonth', e.target.value)} className="bg-transparent text-white w-16 text-right outline-none font-bold" />
                                 <select value={config[tier].currency || 'USD'} onChange={(e) => handleChange(tier, 'currency', e.target.value)} className="bg-slate-800 text-slate-300 text-xs rounded px-1 py-1 outline-none">
                                     <option value="USD">USD</option>
                                     <option value="PEN">PEN</option>
                                 </select>
                             </div>
                         </div>
                         <div className="p-6">
                             {/* Payment Link Section */}
                             <div className="mb-6 bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                                 <label className="text-xs uppercase text-green-400 font-bold mb-2 flex items-center gap-1">
                                     <CreditCard size={12} /> Payment Checkout Link (Stripe/MercadoPago)
                                 </label>
                                 <input 
                                    type="text" 
                                    placeholder="https://mpago.la/..." 
                                    value={config[tier].paymentLink || ''} 
                                    onChange={(e) => handleChange(tier, 'paymentLink', e.target.value)} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-green-500 outline-none" 
                                 />
                                 <p className="text-[10px] text-slate-500 mt-1">Paste a Mercado Pago or Stripe payment link here. Users will be redirected here when upgrading.</p>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                 {/* Simplified inputs for brevity */}
                                 <div className="space-y-2">
                                     <h4 className="text-xs uppercase text-indigo-400 font-bold">Trade</h4>
                                     <input type="number" placeholder="Binders" value={config[tier].maxTradeBinders} onChange={(e) => handleChange(tier, 'maxTradeBinders', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-sm" />
                                     <input type="number" placeholder="Cards/Binder" value={config[tier].maxCardsPerTradeBinder} onChange={(e) => handleChange(tier, 'maxCardsPerTradeBinder', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-sm" />
                                 </div>
                                 <div className="space-y-2">
                                     <h4 className="text-xs uppercase text-pink-400 font-bold">Wishlist</h4>
                                     <input type="number" placeholder="Binders" value={config[tier].maxWishlistBinders} onChange={(e) => handleChange(tier, 'maxWishlistBinders', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-sm" />
                                     <input type="number" placeholder="Cards/Binder" value={config[tier].maxCardsPerWishlistBinder} onChange={(e) => handleChange(tier, 'maxCardsPerWishlistBinder', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-sm" />
                                 </div>
                                 <div className="space-y-2">
                                     <h4 className="text-xs uppercase text-amber-400 font-bold">Auction</h4>
                                     <input type="number" placeholder="Binders" value={config[tier].maxAuctionBinders} onChange={(e) => handleChange(tier, 'maxAuctionBinders', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-sm" />
                                     <input type="number" placeholder="Cards/Binder" value={config[tier].maxAuctionCardsPerBinder} onChange={(e) => handleChange(tier, 'maxAuctionCardsPerBinder', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-sm" />
                                 </div>
                                 <div className="space-y-2">
                                     <h4 className="text-xs uppercase text-slate-400 font-bold">General</h4>
                                     <input type="number" placeholder="Showcase Items" value={config[tier].maxShowcaseItems} onChange={(e) => handleChange(tier, 'maxShowcaseItems', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-sm" />
                                 </div>
                             </div>
                         </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const UserManagementTab = () => {
    const [targetEmail, setTargetEmail] = useState('');
    const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(SubscriptionTier.RARE);
    const [isAssigning, setIsAssigning] = useState(false);
    const [isWiping, setIsWiping] = useState(false);

    const handleUpdateTier = async () => {
        if (!targetEmail.trim()) { alert('Please enter an email.'); return; }
        setIsAssigning(true);
        try {
            await adminService.assignTierByEmail(targetEmail, selectedTier);
            alert(`Success! ${targetEmail} is now assigned to the ${selectedTier} tier.`);
            setTargetEmail('');
        } catch (e: any) { alert(e.message); }
        setIsAssigning(false);
    };

    const handleWipe = async () => {
        if (!confirm("DANGER: WIPE ALL DATA?")) return;
        setIsWiping(true);
        try {
            await adminService.wipeDatabase();
            window.location.reload();
        } catch(e) { alert("Failed"); setIsWiping(false); }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <UserPlus size={20} className="text-indigo-400" /> User Tier Management
                </h3>
                <div className="space-y-4">
                    <div className="flex flex-col gap-3">
                        <input
                            type="text"
                            placeholder="User Google Email"
                            value={targetEmail}
                            onChange={(e) => setTargetEmail(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-violet-500"
                        />
                        <div className="flex gap-2">
                            <select
                                value={selectedTier}
                                onChange={(e) => setSelectedTier(e.target.value as SubscriptionTier)}
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-violet-500"
                            >
                                {Object.values(SubscriptionTier).map(tier => (
                                    <option key={tier} value={tier}>{tier}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={handleUpdateTier}
                                disabled={isAssigning}
                                className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-violet-900/20 flex items-center justify-center gap-2"
                            >
                                {isAssigning ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                Update Tier
                            </button>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-500 flex items-start gap-1">
                        <AlertCircle size={10} className="mt-0.5 shrink-0" />
                        Warning: Downgrading a user may lock their existing binders if they exceed the new tier limits.
                    </p>
                </div>
            </div>
            <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-6">
                <h3 className="text-red-500 font-bold mb-2 flex items-center gap-2"><Trash2 size={20} /> Danger Zone</h3>
                <button onClick={handleWipe} disabled={isWiping} className="bg-red-600/10 hover:bg-red-600 hover:text-white text-red-500 border border-red-600/50 px-4 py-3 rounded-lg flex items-center gap-2 font-bold w-full justify-center">
                    {isWiping ? <Loader2 className="animate-spin"/> : 'Wipe Database'}
                </button>
            </div>
        </div>
    );
};

const NewsManagerTab = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    // Form State
    const [title, setTitle] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [sourceName, setSourceName] = useState('');
    const [game, setGame] = useState<GameType>(GameType.MTG);

    useEffect(() => { load(); }, []);
    const load = async () => {
        setLoading(true);
        setNews(await newsService.getNews());
        setLoading(false);
    }

    const handleSubmit = async () => {
        if (!title.trim() || !sourceName.trim() || !imageUrl.trim() || !linkUrl.trim()) {
            alert('Please fill in all required fields (*).');
            return;
        }
        try {
            await newsService.addNews({
                title, imageUrl, linkUrl, sourceName, game,
                date: Date.now()
            });
            setIsFormOpen(false);
            setTitle(''); setImageUrl(''); setLinkUrl(''); setSourceName('');
            load();
        } catch (err: any) {
            alert('Error publishing news: ' + err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if(confirm("Delete news item?")) {
            await newsService.deleteNews(id);
            load();
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">News Feed</h3>
                <button onClick={() => setIsFormOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Plus size={18}/> Add News</button>
            </div>

            {isFormOpen && (
                <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl mb-6">
                    <div className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <input placeholder="Title *" value={title} onChange={e=>setTitle(e.target.value)} className="bg-slate-950 border border-slate-700 rounded p-2 text-white"/>
                             <input placeholder="Source Name *" value={sourceName} onChange={e=>setSourceName(e.target.value)} className="bg-slate-950 border border-slate-700 rounded p-2 text-white"/>
                             <input placeholder="Image URL *" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} className="bg-slate-950 border border-slate-700 rounded p-2 text-white"/>
                             <input placeholder="Link URL *" value={linkUrl} onChange={e=>setLinkUrl(e.target.value)} className="bg-slate-950 border border-slate-700 rounded p-2 text-white"/>
                             <select value={game} onChange={(e: any)=>setGame(e.target.value)} className="bg-slate-950 border border-slate-700 rounded p-2 text-white">
                                 {Object.values(GameType).map(g => <option key={g} value={g}>{g}</option>)}
                             </select>
                         </div>
                         <div className="flex gap-2">
                             <button type="button" onClick={()=>setIsFormOpen(false)} className="bg-slate-800 text-white px-4 py-2 rounded">Cancel</button>
                             <button type="button" onClick={handleSubmit} className="bg-green-600 text-white px-4 py-2 rounded">Publish</button>
                         </div>
                    </div>
                </div>
            )}

            {loading ? <div className="text-center text-slate-500">Loading...</div> : (
                <div className="space-y-4">
                    {news.map(item => (
                        <div key={item.id} className="flex gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl items-center">
                             <img src={item.imageUrl} className="w-16 h-16 object-cover rounded bg-slate-950" alt=""/>
                             <div className="flex-1">
                                 <h4 className="text-white font-bold">{item.title}</h4>
                                 <div className="text-xs text-slate-400">{item.sourceName} • {item.game}</div>
                             </div>
                             <a href={item.linkUrl} target="_blank" className="p-2 text-slate-400 hover:text-white"><ExternalLink size={18}/></a>
                             <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18}/></button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
};

const StoreManagerTab = () => {
    const [stores, setStores] = useState<StoreProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    // Form
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [mapsUrl, setMapsUrl] = useState('');
    const [linkedProfileInput, setLinkedProfileInput] = useState(''); // New input for URL or ID
    const [selectedGames, setSelectedGames] = useState<GameType[]>([]);

    useEffect(() => { load(); }, []);
    const load = async () => {
        setLoading(true);
        setStores(await storeDirectoryService.getStores());
        setLoading(false);
    }

    const toggleGame = (g: GameType) => {
        if (selectedGames.includes(g)) setSelectedGames(prev => prev.filter(x => x !== g));
        else setSelectedGames(prev => [...prev, g]);
    }

    const handleSubmit = async () => {
        if (!name.trim() || !location.trim() || !logoUrl.trim() || !websiteUrl.trim() || !mapsUrl.trim()) {
            alert('Please fill in all required fields (Store Name, Location, Logo URL, Website URL, Maps URL).');
            return;
        }

        let linkedUserId: string | undefined = undefined;
        if (linkedProfileInput.trim()) {
            const urlMatch = linkedProfileInput.match(/[?&]trader=([^&]+)/);
            linkedUserId = urlMatch ? urlMatch[1] : linkedProfileInput.trim();
        }

        const payload: any = { name, location, logoUrl, websiteUrl, mapsUrl, games: selectedGames };
        if (linkedUserId) payload.linkedUserId = linkedUserId;

        try {
            await storeDirectoryService.addStore(payload);
            setIsFormOpen(false);
            setName(''); setLocation(''); setLogoUrl(''); setWebsiteUrl(''); setMapsUrl(''); setLinkedProfileInput(''); setSelectedGames([]);
            load();
        } catch (err: any) {
            alert('Error adding store: ' + err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if(confirm("Delete store?")) {
            await storeDirectoryService.deleteStore(id);
            load();
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Store Directory</h3>
                <button onClick={() => setIsFormOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Plus size={18}/> Add Store</button>
            </div>

            {isFormOpen && (
                <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl mb-6">
                    <div className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <input placeholder="Store Name *" value={name} onChange={e=>setName(e.target.value)} className="bg-slate-950 border border-slate-700 rounded p-2 text-white"/>
                             <input placeholder="Location (e.g. Lima, Peru) *" value={location} onChange={e=>setLocation(e.target.value)} className="bg-slate-950 border border-slate-700 rounded p-2 text-white"/>
                             <input placeholder="Logo Image URL *" value={logoUrl} onChange={e=>setLogoUrl(e.target.value)} className="bg-slate-950 border border-slate-700 rounded p-2 text-white"/>
                             <input placeholder="Website URL *" value={websiteUrl} onChange={e=>setWebsiteUrl(e.target.value)} className="bg-slate-950 border border-slate-700 rounded p-2 text-white"/>
                             <input placeholder="Google Maps URL *" value={mapsUrl} onChange={e=>setMapsUrl(e.target.value)} className="bg-slate-950 border border-slate-700 rounded p-2 text-white"/>
                             <div className="relative">
                                <Link size={16} className="absolute left-3 top-3 text-slate-500" />
                                <input
                                    placeholder="Linked Profile (Paste Share Link) - Optional"
                                    value={linkedProfileInput}
                                    onChange={e=>setLinkedProfileInput(e.target.value)}
                                    className="bg-slate-950 border border-slate-700 rounded p-2 pl-9 text-white w-full"
                                    title="Paste a full share profile URL or a User ID to link this store to an app account"
                                />
                             </div>
                         </div>
                         <div>
                             <label className="text-sm text-slate-400 mb-2 block">Games Sold:</label>
                             <div className="flex gap-2">
                                 <button
                                    type="button"
                                    onClick={() => toggleGame(GameType.MTG)}
                                    className={`px-3 py-1 rounded text-sm border ${selectedGames.includes(GameType.MTG) ? 'bg-violet-600 border-violet-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-400'}`}
                                 >
                                     MTG
                                 </button>
                             </div>
                         </div>
                         <div className="flex gap-2">
                             <button type="button" onClick={()=>setIsFormOpen(false)} className="bg-slate-800 text-white px-4 py-2 rounded">Cancel</button>
                             <button type="button" onClick={handleSubmit} className="bg-green-600 text-white px-4 py-2 rounded">Add Store</button>
                         </div>
                    </div>
                </div>
            )}

            {loading ? <div className="text-center text-slate-500">Loading...</div> : (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {stores.map(store => (
                        <div key={store.id} className="relative bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col items-center text-center">
                             {store.linkedUserId && (
                                 <div className="absolute top-2 left-2 bg-blue-500 text-white p-1 rounded-full shadow-lg" title="Linked to App Profile">
                                     <UserCheck size={12} />
                                 </div>
                             )}
                             <img src={store.logoUrl} className="w-16 h-16 object-contain rounded-full bg-slate-950 border border-slate-800 mb-2" alt=""/>
                             <h4 className="text-white font-bold">{store.name}</h4>
                             <p className="text-xs text-slate-400">{store.location}</p>
                             <div className="flex gap-1 mt-2 mb-2">
                                 {store.games.map(g => (
                                     <div key={g} className="w-2 h-2 rounded-full bg-slate-500" title={g}/>
                                 ))}
                             </div>
                             <button onClick={() => handleDelete(store.id)} className="absolute top-2 right-2 text-slate-500 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
};

function feedbackLabel(v: FeedbackValue | undefined): string {
    if (v == null) return '—';
    if (v === FeedbackValue.EXCELENTE) return '⭐ Excelente';
    if (v === FeedbackValue.BUENO) return '👍 Bueno';
    if (v === FeedbackValue.MALO) return '👎 Malo';
    if (v === FeedbackValue.NO_CONCRETADO) return '❌ No concretado';
    return String(v);
}

const DisputesTab = () => {
    const [disputes, setDisputes] = useState<TradeInteraction[]>([]);
    const [loading, setLoading] = useState(true);
    const [resolvingId, setResolvingId] = useState<string | null>(null);

    useEffect(() => { loadDisputes(); }, []);

    const loadDisputes = async () => {
        setLoading(true);
        try {
            const data = await adminService.getDisputedInteractions();
            setDisputes(data);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (id: string, decision: 'COMPLETE' | 'IGNORE') => {
        const label = decision === 'COMPLETE' ? 'dar por válida' : 'ignorar';
        if (!confirm(`¿Seguro que deseas ${label} esta disputa?`)) return;
        setResolvingId(id);
        try {
            await adminService.resolveDispute(id, decision);
            setDisputes(prev => prev.filter(d => d.id !== id));
        } catch (e) {
            alert('Error al resolver la disputa.');
            console.error(e);
        } finally {
            setResolvingId(null);
        }
    };

    if (loading) return <div className="text-slate-400 py-8 text-center">Cargando disputas...</div>;

    if (disputes.length === 0) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
                <AlertCircle size={40} className="text-green-500 mx-auto mb-3" />
                <h3 className="text-white font-bold text-lg mb-1">Sin disputas activas</h3>
                <p className="text-slate-400 text-sm">Todas las interacciones están resueltas.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-slate-400 text-sm">{disputes.length} disputa{disputes.length !== 1 ? 's' : ''} pendiente{disputes.length !== 1 ? 's' : ''} de revisión.</p>
            {disputes.map(d => (
                <div key={d.id} className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <AlertCircle size={14} /> Disputa
                        </span>
                        <span className="text-xs text-slate-500">{new Date(d.timestamp).toLocaleDateString('es-PE')}</span>
                    </div>

                    <p className="text-white font-medium">{d.cardName || 'Consulta general'}</p>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-slate-800 rounded-lg p-3">
                            <p className="text-slate-400 text-xs mb-1">Comprador</p>
                            <p className="text-white font-medium truncate">{d.buyerName}</p>
                            <p className="text-xs mt-1">{feedbackLabel(d.buyerFeedback)}</p>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-3">
                            <p className="text-slate-400 text-xs mb-1">Vendedor</p>
                            <p className="text-white font-medium truncate">{d.sellerName}</p>
                            <p className="text-xs mt-1">{feedbackLabel(d.sellerFeedback)}</p>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={() => handleResolve(d.id, 'COMPLETE')}
                            disabled={resolvingId === d.id}
                            className="flex-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-bold py-2 rounded-lg transition-colors"
                        >
                            {resolvingId === d.id ? '...' : '✓ Dar por válida'}
                        </button>
                        <button
                            onClick={() => handleResolve(d.id, 'IGNORE')}
                            disabled={resolvingId === d.id}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-sm font-bold py-2 rounded-lg transition-colors"
                        >
                            {resolvingId === d.id ? '...' : '✕ Ignorar'}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AdminPanel;
