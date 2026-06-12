
import React, { useState, useEffect } from 'react';
import { Check, ChevronRight, MapPin, MessageCircle, Loader2, Gift, Star } from 'lucide-react';
import { UserProfile, StoreProfile, SubscriptionTier } from '../types';
import { auth, storeDirectoryService } from '../services/store';

interface WelcomeWizardProps {
  user: UserProfile;
  onComplete: () => void;
}

const TOTAL_STEPS = 3;

const TIER_PERKS: Record<SubscriptionTier, { binders: number; cards: number }> = {
  [SubscriptionTier.COMMON]:   { binders: 1,   cards: 20  },
  [SubscriptionTier.UNCOMMON]: { binders: 3,   cards: 50  },
  [SubscriptionTier.RARE]:     { binders: 10,  cards: 100 },
  [SubscriptionTier.MYTHIC]:   { binders: 100, cards: 500 },
};

function daysRemaining(isoDate?: string): number | null {
  if (!isoDate) return null;
  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const WelcomeWizard: React.FC<WelcomeWizardProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [whatsapp, setWhatsapp] = useState(user.whatsapp || '');
  const [preferredStore, setPreferredStore] = useState(user.preferredStore || '');
  const [stores, setStores] = useState<StoreProfile[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    storeDirectoryService.getStores().then(setStores).catch(() => {});
  }, []);

  const handleFinish = async () => {
    setSaving(true);
    try {
      await auth.updateProfile({
        displayName: displayName.trim() || user.displayName,
        whatsapp: whatsapp.trim() || undefined,
        preferredStore: preferredStore || undefined,
        onboardingComplete: true,
      });
    } finally {
      setSaving(false);
      onComplete();
    }
  };

  const trialDays = daysRemaining(user.trialEndsAt);
  const isTrialUser = user.subscriptionTier === SubscriptionTier.UNCOMMON && trialDays !== null;
  const perks = TIER_PERKS[user.subscriptionTier] ?? TIER_PERKS[SubscriptionTier.COMMON];

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Progress bar */}
        <div className="h-1 bg-slate-800">
          <div
            className="h-full bg-violet-600 transition-all duration-500"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        <div className="p-6 space-y-6">

          {/* Step indicator */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Paso {step} de {TOTAL_STEPS}</span>
            <div className="flex gap-1.5">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${i < step ? 'bg-violet-500' : 'bg-slate-700'}`}
                />
              ))}
            </div>
          </div>

          {/* ── Step 1: Nombre ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-white">¡Bienvenido a Frantic Search!</h2>
                <p className="text-slate-400 text-sm mt-1">¿Cómo quieres que te llamen otros traders?</p>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-500">Tu nombre</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Ej: DarkRitual_Lima"
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500 outline-none text-lg"
                />
                <p className="text-xs text-slate-500">Así apareces en trades, rankings y MarketMatch</p>
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!displayName.trim()}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                Continuar <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* ── Step 2: Contacto ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">Tu zona de trading</h2>
                <p className="text-slate-400 text-sm mt-1">Otros traders usan esto para coordinar encuentros</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
                    <MessageCircle size={12} /> WhatsApp
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-mono">+51</span>
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={e => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                      placeholder="9XXXXXXXX"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-violet-500 outline-none"
                    />
                  </div>
                  <p className="text-xs text-slate-500">Necesario para que otros traders puedan contactarte</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
                    <MapPin size={12} /> Tienda preferida
                  </label>
                  <select
                    value={preferredStore}
                    onChange={e => setPreferredStore(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500 outline-none"
                  >
                    <option value="">-- Selecciona una tienda --</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">Aparece en tu perfil público y en MarketMatch</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 text-slate-400 hover:text-white py-3 rounded-xl font-medium transition-colors text-sm"
                >
                  Omitir por ahora
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  Continuar <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Plan ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-violet-500/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <Gift className="text-violet-400" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {isTrialUser ? `${trialDays} días de UNCOMMON gratis` : `Plan ${user.subscriptionTier}`}
                  </h2>
                  <p className="text-slate-400 text-sm mt-0.5">
                    {isTrialUser
                      ? 'Tienes acceso completo durante tu periodo de prueba'
                      : 'Lo que incluye tu plan actual'}
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Check size={16} className="text-green-400 shrink-0" />
                  <span className="text-slate-300"><span className="text-white font-bold">{perks.binders} binders</span> para organizar tus cartas</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Check size={16} className="text-green-400 shrink-0" />
                  <span className="text-slate-300"><span className="text-white font-bold">{perks.cards} cartas</span> por binder</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Check size={16} className="text-green-400 shrink-0" />
                  <span className="text-slate-300">Acceso a <span className="text-white font-bold">MarketMatch</span> para encontrar traders</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Check size={16} className="text-green-400 shrink-0" />
                  <span className="text-slate-300">Importación por <span className="text-white font-bold">CSV</span> (Deckbox, Moxfield, ManaBox)</span>
                </div>
                {isTrialUser && (
                  <div className="flex items-center gap-3 text-sm">
                    <Star size={16} className="text-amber-400 shrink-0" />
                    <span className="text-slate-300">Vence <span className="text-amber-400 font-bold">{new Date(user.trialEndsAt!).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}</span> — sin tarjeta requerida</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleFinish}
                disabled={saving}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                {saving ? 'Guardando...' : '¡Empezar a tradear!'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeWizard;
