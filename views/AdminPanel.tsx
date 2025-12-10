
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import { configService, auth, adminService } from '../services/store';
import { GlobalConfig, SubscriptionTier } from '../types';

interface AdminPanelProps {
    onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
    const [config, setConfig] = useState<GlobalConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isWiping, setIsWiping] = useState(false);
    const [user] = useState(auth.getCurrentUser());

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setIsLoading(true);
        // Ensure user is admin
        if (!user?.isAdmin) {
            setIsLoading(false);
            return;
        }
        const data = await configService.loadConfig();
        setConfig(data);
        setIsLoading(false);
    };

    const handleSave = async () => {
        if (!config) return;
        setIsSaving(true);
        try {
            await configService.updateConfig(config);
            alert("Settings saved successfully.");
        } catch (e) {
            console.error("Save failed", e);
            alert("Failed to save settings.");
        }
        setIsSaving(false);
    };

    const handleWipeDatabase = async () => {
        const confirm1 = window.confirm("DANGER: This will delete ALL users, binders, and cards. This cannot be undone.");
        if (!confirm1) return;
        const confirm2 = window.confirm("Are you absolutely sure you want to restart all tests? This app will reload after wiping.");
        if (!confirm2) return;

        setIsWiping(true);
        try {
            await adminService.wipeDatabase();
            alert("Database wiped successfully. Reloading app...");
            window.location.reload();
        } catch (e: any) {
            alert("Failed to wipe database: " + e.message);
            setIsWiping(false);
        }
    }

    const handleChange = (tier: SubscriptionTier, field: 'maxTradeBinders' | 'maxShowcaseItems', value: string) => {
        if (!config) return;
        const numValue = parseInt(value) || 0;
        
        setConfig(prev => {
            if (!prev) return null;
            return {
                ...prev,
                [tier]: {
                    ...prev[tier],
                    [field]: numValue
                }
            };
        });
    };

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

    if (isLoading || !config) {
        return <div className="p-10 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-2"/> Loading Admin Panel...</div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6 pb-24">
            <header className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        Admin Control Panel <ShieldAlert size={20} className="text-red-500" />
                    </h1>
                    <p className="text-slate-400">Configure system limits and subscription tiers.</p>
                </div>
                <div className="ml-auto flex gap-3">
                    <button 
                        onClick={handleSave}
                        disabled={isSaving || isWiping}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-lg shadow-green-900/20"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Save Changes
                    </button>
                </div>
            </header>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950 border-b border-slate-800">
                                <th className="p-4 text-slate-400 font-medium uppercase text-sm tracking-wider">Tier</th>
                                <th className="p-4 text-slate-400 font-medium uppercase text-sm tracking-wider">Max Trade Binders</th>
                                <th className="p-4 text-slate-400 font-medium uppercase text-sm tracking-wider">Max Showcase Items</th>
                                <th className="p-4 text-slate-400 font-medium uppercase text-sm tracking-wider">Monthly Price ($)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {Object.values(SubscriptionTier).map((tier) => (
                                <tr key={tier} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-4 font-bold text-white">
                                        <span className={`px-2 py-1 rounded text-xs uppercase ${
                                            tier === SubscriptionTier.RARE ? 'bg-amber-500/20 text-amber-500' :
                                            tier === SubscriptionTier.UNCOMMON ? 'bg-slate-500/20 text-slate-300' :
                                            'bg-slate-700/50 text-slate-400'
                                        }`}>
                                            {tier}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <input 
                                            type="number" 
                                            value={config[tier].maxTradeBinders}
                                            onChange={(e) => handleChange(tier, 'maxTradeBinders', e.target.value)}
                                            className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white w-24 text-center focus:ring-2 focus:ring-violet-500 outline-none"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <input 
                                            type="number" 
                                            value={config[tier].maxShowcaseItems}
                                            onChange={(e) => handleChange(tier, 'maxShowcaseItems', e.target.value)}
                                            className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white w-24 text-center focus:ring-2 focus:ring-violet-500 outline-none"
                                        />
                                    </td>
                                    <td className="p-4 text-slate-500">
                                        ${config[tier].pricePerMonth}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-6">
                <h3 className="text-red-500 font-bold mb-2 flex items-center gap-2">
                    <Trash2 size={20} /> Danger Zone
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                    These actions are destructive and cannot be undone. Use for testing or resetting the environment.
                </p>
                <button 
                    onClick={handleWipeDatabase}
                    disabled={isWiping}
                    className="bg-red-600/10 hover:bg-red-600 hover:text-white text-red-500 border border-red-600/50 px-4 py-3 rounded-lg flex items-center gap-2 font-bold transition-all w-full md:w-auto justify-center"
                >
                    {isWiping ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                    Wipe Database (Reset Tests)
                </button>
            </div>
        </div>
    );
};

export default AdminPanel;
