
import React, { useEffect } from 'react';
import { Search, TrendingUp, Shield, Folder, Plus, Bell, Check, ChevronRight, Star, Zap, MapPin } from 'lucide-react';
import { auth } from '../services/store';

interface LandingProps {
  onLogin: () => void;
}

// ── Scroll-reveal hook ────────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ── Pricing data ──────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: 'Common',
    price: 'S/ 0',
    period: '/mes',
    highlight: false,
    badge: null,
    perks: [
      '1 Binder de Intercambio (25 cartas)',
      '3 Binders de Deseos (25 cartas c/u)',
      '1 Binder de Subasta (1 carta)',
      '3 Alertas de cartas',
      '1 Carta en Vitrina',
    ],
    cta: 'Empezar gratis',
  },
  {
    name: 'Uncommon',
    price: 'S/ 5',
    period: '/mes',
    highlight: true,
    badge: '30 días gratis',
    perks: [
      '5 Binders de Intercambio (50 cartas)',
      '10 Binders de Deseos (50 cartas c/u)',
      '2 Binders de Subasta (10 cartas)',
      '5 Alertas de cartas',
      '5 Cartas en Vitrina',
    ],
    cta: 'Crear cuenta gratis',
  },
  {
    name: 'Rare',
    price: 'S/ 10',
    period: '/mes',
    highlight: false,
    badge: null,
    perks: [
      '15 Binders de Intercambio (75 cartas)',
      '10 Binders de Deseos (75 cartas c/u)',
      '5 Binders de Subasta (10 cartas)',
      '10 Alertas de cartas',
      '10 Cartas en Vitrina',
    ],
    cta: 'Elegir Rare',
  },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────
const Landing: React.FC<LandingProps> = ({ onLogin }) => {
  useScrollReveal();

  const handleLogin = () => {
    auth.login().catch(console.error);
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-slate-200 font-sans overflow-x-hidden">

      {/* ── NAVBAR ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#0a0e1a]/80 backdrop-blur-md border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 group"
          >
            <div className="logo-float w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/30">
              <span className="text-sm font-black text-white">FS</span>
            </div>
            <span className="font-bold text-white hidden sm:block">Frantic Search</span>
          </button>

          <div className="flex items-center gap-6">
            <button
              onClick={() => scrollTo('planes')}
              className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:block"
            >
              Planes
            </button>
            <button
              onClick={() => scrollTo('tiendas')}
              className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:block"
            >
              Tiendas
            </button>
            <button
              onClick={handleLogin}
              className="text-sm bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left: copy */}
            <div className="space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-xs font-medium text-violet-400">
                <Zap size={12} />
                Market TCG del Perú — en beta
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight">
                Deja de buscar.{' '}
                <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                  Empieza a encontrar.
                </span>
              </h1>

              <p className="text-lg text-slate-400 max-w-lg mx-auto lg:mx-0">
                La plataforma que conecta a jugadores de Magic: The Gathering en Perú.
                Precios reales, trades verificados, cero adivinanzas.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <button
                  onClick={handleLogin}
                  className="cta-primary bg-violet-600 hover:bg-violet-700 text-white px-8 py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2"
                >
                  Crea tu cuenta gratis <ChevronRight size={18} />
                </button>
                <button
                  onClick={handleLogin}
                  className="text-slate-400 hover:text-white px-6 py-3.5 font-medium transition-colors text-sm"
                >
                  ¿Ya tienes cuenta? Inicia sesión
                </button>
              </div>

              <p className="text-xs text-slate-600">
                30 días gratis de plan Uncommon al registrarte. Sin tarjeta de crédito.
              </p>
            </div>

            {/* Right: Market Match foil preview */}
            <div className="flex justify-center lg:justify-end">
              <div className="foil-border shadow-2xl shadow-violet-900/30">
                <div className="bg-[#111827] rounded-[12px] w-72 p-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1">
                      <Search size={10} /> Market Match
                    </span>
                    <span className="text-[10px] text-green-400 font-medium bg-green-500/10 px-2 py-0.5 rounded-full">
                      1 match encontrado
                    </span>
                  </div>

                  <div className="bg-slate-900/60 rounded-lg p-2.5">
                    <p className="text-[10px] text-slate-500 mb-1">Tú buscas:</p>
                    <p className="text-sm font-bold text-white">Teferi's Protection</p>
                    <p className="text-xs text-slate-400">Commander 2017 — NM</p>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">W</div>
                      <div>
                        <p className="text-xs font-bold text-white">Wall-e Gaming</p>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Star size={8} className="text-amber-400" fill="currentColor" /> 4.9 · 23 trades
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500">Precio</p>
                        <p className="text-sm font-black text-green-400">S/ 95.00</p>
                        <p className="text-[10px] text-slate-500">CK: US$ 28.00</p>
                      </div>
                      <button className="bg-violet-600 hover:bg-violet-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-colors">
                        Contactar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── EL PROBLEMA ─────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-[#0d1117]">
        <div className="max-w-5xl mx-auto">
          <h2 className="reveal text-3xl font-black text-center text-white mb-2">¿Te suena familiar?</h2>
          <p className="reveal reveal-d1 text-slate-500 text-center mb-12 text-sm">El mercado de cartas en Perú tiene problemas de siempre.</p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Search size={28} className="text-violet-400" />,
                title: 'Publicar en 5 grupos y esperar',
                text: 'Subes tu carta a Facebook, WhatsApp, Discord... y cruzas los dedos. Nadie te responde, o te responden 3 semanas después.',
                delay: '',
              },
              {
                icon: <TrendingUp size={28} className="text-amber-400" />,
                title: '¿Cuánto vale esta carta?',
                text: 'Cada vendedor tiene su propio precio. No hay referencia clara. Terminas pagando de más o vendiendo de menos.',
                delay: 'reveal-d1',
              },
              {
                icon: <Shield size={28} className="text-red-400" />,
                title: 'Confiar en desconocidos',
                text: 'Le mandas tu carta a alguien que no conoces. No hay historial, no hay reputación, no hay garantías.',
                delay: 'reveal-d2',
              },
            ].map((p, i) => (
              <div key={i} className={`reveal ${p.delay} bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-3`}>
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center">{p.icon}</div>
                <h3 className="font-bold text-white text-lg">{p.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>

          <p className="reveal reveal-d1 text-center text-violet-400 font-bold text-lg mt-10">
            Frantic Search resuelve los tres.
          </p>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ───────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="reveal text-3xl font-black text-center text-white mb-2">Cómo funciona</h2>
          <p className="reveal reveal-d1 text-slate-500 text-center mb-12 text-sm">Tres herramientas. Un solo objetivo.</p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <TrendingUp size={24} className="text-green-400" />,
                title: 'Precios de Card Kingdom, en soles',
                text: 'Cada carta muestra su precio de referencia internacional actualizado diariamente, convertido a soles con un multiplicador que tú controlas. Se acabaron las adivinanzas.',
                delay: '',
              },
              {
                icon: <Search size={24} className="text-violet-400" />,
                title: 'Te avisamos cuando alguien tiene lo que buscas',
                text: 'Agrega cartas a tu Lista de Deseos. Nuestro algoritmo cruza automáticamente tu lista contra lo que otros usuarios están vendiendo. Tú no buscas. Nosotros te encontramos.',
                delay: 'reveal-d1',
              },
              {
                icon: <Shield size={24} className="text-amber-400" />,
                title: 'Sabe con quién estás tratando',
                text: 'Cada usuario tiene dos puntajes: uno como vendedor (Trader) y otro como comprador (Searcher). Construidos por la comunidad, basados en trades reales confirmados por ambas partes.',
                delay: 'reveal-d2',
              },
            ].map((p, i) => (
              <div key={i} className={`reveal ${p.delay} relative bg-gradient-to-b from-slate-800/50 to-slate-900/30 border border-slate-700/50 rounded-2xl p-6 space-y-3`}>
                <div className="w-11 h-11 bg-slate-800 rounded-xl flex items-center justify-center">{p.icon}</div>
                <h3 className="font-bold text-white">{p.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PASO A PASO ──────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-[#0d1117]">
        <div className="max-w-4xl mx-auto">
          <h2 className="reveal text-3xl font-black text-center text-white mb-2">Empieza en 3 minutos</h2>
          <p className="reveal reveal-d1 text-slate-500 text-center mb-12 text-sm">Sin curva de aprendizaje.</p>

          <div className="space-y-6">
            {[
              {
                n: '1',
                icon: <Folder size={20} className="text-violet-400" />,
                title: 'Crea tu Binder',
                text: 'Organiza tus cartas en binders de Intercambio/Venta o Lista de Deseos. Puedes importar desde CSV si ya tienes tu colección en Deckbox o Moxfield.',
                delay: '',
              },
              {
                n: '2',
                icon: <Plus size={20} className="text-violet-400" />,
                title: 'Agrega tus cartas',
                text: 'Busca por nombre, selecciona la edición y condición. El precio de referencia aparece automáticamente. ¿Quieres tu propio precio? Ponlo y listo.',
                delay: 'reveal-d1',
              },
              {
                n: '3',
                icon: <Bell size={20} className="text-violet-400" />,
                title: 'Recibe matches y conecta',
                text: 'Cuando alguien tenga lo que buscas (o busque lo que tienes), te avisamos. Un click y ya estás en contacto directo.',
                delay: 'reveal-d2',
              },
            ].map((step) => (
              <div key={step.n} className={`reveal ${step.delay} flex gap-5 bg-[#111827] border border-slate-800 rounded-2xl p-5`}>
                <div className="shrink-0 w-10 h-10 bg-violet-600/20 border border-violet-600/30 rounded-xl flex items-center justify-center">
                  <span className="font-black text-violet-400">{step.n}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    {step.icon}
                    <h3 className="font-bold text-white">{step.title}</h3>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">{step.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <button
              onClick={handleLogin}
              className="cta-primary bg-violet-600 hover:bg-violet-700 text-white px-8 py-3.5 rounded-xl font-bold inline-flex items-center gap-2"
            >
              Quiero empezar <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ─────────────────────────────────────────────────── */}
      <section id="tiendas" className="py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="reveal text-3xl font-black text-white mb-2">La comunidad que lo respalda</h2>
          <p className="reveal reveal-d1 text-slate-500 mb-12 text-sm">Tiendas que ya confían en Frantic Search</p>

          <div className="reveal reveal-d1 flex justify-center mb-10">
            <div className="bg-[#111827] border border-slate-700 rounded-2xl px-8 py-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-violet-600/20 rounded-xl flex items-center justify-center">
                <MapPin size={18} className="text-violet-400" />
              </div>
              <div className="text-left">
                <p className="font-bold text-white">La Mazmorra</p>
                <p className="text-xs text-slate-400">Lima, Perú · Tienda aliada</p>
              </div>
              <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded-full font-bold ml-2">
                Partner
              </span>
            </div>
          </div>

          <div className="reveal reveal-d2 bg-gradient-to-r from-violet-900/20 via-indigo-900/20 to-violet-900/20 border border-violet-800/30 rounded-2xl p-8 max-w-2xl mx-auto">
            <p className="text-violet-300 font-medium text-lg leading-relaxed">
              Estamos en lanzamiento. Sé de los primeros en armar tu colección digital
              y ganar reputación desde el día uno.
            </p>
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section id="planes" className="py-20 px-4 bg-[#0d1117]">
        <div className="max-w-5xl mx-auto">
          <h2 className="reveal text-3xl font-black text-center text-white mb-2">Elige tu plan</h2>
          <p className="reveal reveal-d1 text-slate-500 text-center mb-12 text-sm">Empieza gratis. Crece cuando lo necesites.</p>

          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {PLANS.map((plan, i) => (
              <div
                key={plan.name}
                className={`reveal reveal-d${i} flex flex-col rounded-2xl p-6 space-y-4 border transition-all
                  ${plan.highlight
                    ? 'bg-gradient-to-b from-violet-900/30 to-indigo-900/20 border-violet-500/50 shadow-lg shadow-violet-900/20'
                    : 'bg-[#111827] border-slate-800'}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${plan.highlight ? 'text-violet-400' : 'text-slate-500'}`}>
                      {plan.name}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">{plan.price}</span>
                      <span className="text-slate-500 text-sm">{plan.period}</span>
                    </div>
                  </div>
                  {plan.badge && (
                    <span className="badge-pulse text-[10px] bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-1 rounded-full font-bold shrink-0">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <ul className="space-y-2 flex-1">
                  {plan.perks.map((perk, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm">
                      <Check size={14} className={`shrink-0 mt-0.5 ${plan.highlight ? 'text-violet-400' : 'text-slate-500'}`} />
                      <span className="text-slate-300">{perk}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={handleLogin}
                  className={`w-full py-2.5 rounded-xl font-bold text-sm transition-colors
                    ${plan.highlight
                      ? 'cta-primary bg-violet-600 hover:bg-violet-700 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          <p className="reveal reveal-d1 text-center text-slate-500 text-sm mt-8">
            ¿Eres una tienda TCG?{' '}
            <a href="mailto:walterpacora88@gmail.com" className="text-violet-400 hover:text-violet-300 underline">
              Conoce el plan Mythic para negocios. Contáctanos →
            </a>
          </p>

          <div className="text-center mt-8">
            <button
              onClick={handleLogin}
              className="cta-primary bg-violet-600 hover:bg-violet-700 text-white px-8 py-3.5 rounded-xl font-bold inline-flex items-center gap-2"
            >
              Crear cuenta gratis con 30 días Uncommon <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="reveal text-4xl font-black text-white leading-tight">
            Tu colección merece mejor que un grupo de Facebook.
          </h2>
          <p className="reveal reveal-d1 text-slate-400 text-lg">
            Únete a la comunidad que está profesionalizando el mercado de cartas en Perú.
          </p>
          <div className="reveal reveal-d2 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleLogin}
              className="cta-primary bg-violet-600 hover:bg-violet-700 text-white px-8 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2"
            >
              Empezar ahora — es gratis <ChevronRight size={18} />
            </button>
            <a
              href="mailto:walterpacora88@gmail.com"
              className="text-slate-400 hover:text-white px-6 py-4 font-medium transition-colors text-sm flex items-center justify-center"
            >
              Soy una tienda → quiero saber más
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="bg-[#07090f] border-t border-slate-800/60 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-black text-white">FS</span>
                </div>
                <span className="font-bold text-white">Frantic Search</span>
              </div>
              <p className="text-slate-500 text-sm">La plataforma TCG del Perú.</p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Producto</p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><button onClick={() => scrollTo('planes')} className="hover:text-white transition-colors">Planes</button></li>
                <li><button onClick={() => scrollTo('tiendas')} className="hover:text-white transition-colors">Tiendas</button></li>
                <li><a href="mailto:walterpacora88@gmail.com" className="hover:text-white transition-colors">Contacto</a></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Comunidad</p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><span className="cursor-default">Instagram</span></li>
                <li><span className="cursor-default">Discord</span></li>
                <li><span className="cursor-default">Facebook</span></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Powered by</p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>Precios: Card Kingdom</li>
                <li>Datos de cartas: Scryfall</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800/60 pt-6 space-y-1">
            <p className="text-xs text-slate-600 text-center">
              © 2026 Frantic Search. Todos los derechos reservados.
            </p>
            <p className="text-xs text-slate-700 text-center">
              Magic: The Gathering es una marca registrada de Wizards of the Coast.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Landing;
