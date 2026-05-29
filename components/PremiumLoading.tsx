
import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';

interface PremiumLoadingProps {
    text: string;
    subtext?: string;
    color?: 'violet' | 'indigo' | 'amber' | 'rose';
}

const PremiumLoading: React.FC<PremiumLoadingProps> = ({ 
    text, 
    subtext = "Preparando la experiencia...", 
    color = 'violet' 
}) => {
    const colorMap = {
        violet: 'bg-violet-600/30 text-violet-500 from-violet-400 via-pink-400 to-indigo-400',
        indigo: 'bg-indigo-600/30 text-indigo-500 from-violet-400 via-indigo-400 to-cyan-400',
        amber: 'bg-amber-600/30 text-amber-500 from-amber-400 via-yellow-400 to-orange-400',
        rose: 'bg-rose-600/30 text-rose-500 from-rose-400 via-fuchsia-400 to-indigo-400',
    };

    const config = colorMap[color];
    const [bgPulse, iconColor, gradientText] = config.split(' ');

    return (
        <div className="h-[60vh] flex flex-col items-center justify-center p-8 text-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative mb-8"
            >
                <div className={`absolute inset-0 ${bgPulse} blur-3xl rounded-full animate-pulse`} />
                <Loader2 size={48} className={`${iconColor} animate-spin relative z-10`} />
            </motion.div>
            
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
            >
                <h2 className={`text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r ${gradientText} animate-gradient-x`}>
                    {text}
                </h2>
                <p className="text-slate-500 text-sm font-medium flex items-center justify-center gap-2">
                    <Sparkles size={14} className="text-amber-500" /> {subtext}
                </p>
            </motion.div>
        </div>
    );
};

export default PremiumLoading;
