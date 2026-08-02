export interface HelpEntry {
  title: string;
  text: string;
}

export const helpTexts: Record<string, HelpEntry> = {
  home: {
    title: 'Tu Inicio',
    text: 'Aquí ves un resumen de tu actividad: cartas destacadas, subastas activas, tiendas aliadas y noticias. Si tienes cartas prestadas, verás el contador aquí.',
  },
  binders: {
    title: 'Tus Binders',
    text: 'Los binders son carpetas para organizar tus cartas. Hay 3 tipos: Intercambio/Venta (cartas que ofreces), Lista de Deseos (cartas que buscas) y Subasta. Cada binder tiene su multiplicador de precio para convertir el valor de Card Kingdom (USD) a soles.',
  },
  binderDetail: {
    title: 'Detalle del Binder',
    text: 'Agrega cartas buscándolas por nombre o subiendo un CSV. Puedes marcar cartas como favoritas para la vitrina, prestar copias con el botón 🤜, o definir tu propio precio. Las cartas aquí serán visibles en el Market Match para otros usuarios.',
  },
  market: {
    title: 'Market Match',
    text: "Este es el corazón de Frantic Search. Cruzamos automáticamente tu Lista de Deseos con las cartas disponibles de otros usuarios. Si alguien tiene lo que buscas, aparece aquí con su precio y reputación. Presiona 'Contactar' para iniciar el trade vía WhatsApp.",
  },
  auctions: {
    title: 'Casa de Subastas',
    text: "Puja por cartas exclusivas o lista las tuyas. Todas las subastas cierran a las 10:00 PM (Lima). Si alguien puja en los últimos 5 minutos, se activa una extensión automática. También puedes usar 'Compra Inmediata' para comprar sin esperar.",
  },
  showcase: {
    title: 'Vitrina de la Comunidad',
    text: "Las cartas destacadas de los traders con mejor reputación. Para que tu carta aparezca aquí, márcala como 'showcase' desde tu binder. La cantidad de cartas que puedes mostrar depende de tu plan.",
  },
  profile: {
    title: 'Tu Perfil',
    text: 'Tu identidad como trader. Aquí gestionas tu apodo, WhatsApp, tienda preferida y tu anuncio público. Tu reputación (Trader Score y Searcher Score) se construye con cada trade que completas. Comparte tu perfil para que otros vean tu inventario.',
  },
};

export interface TourStep {
  targetId: string;
  title: string;
  text: string;
}

export const tourSteps: TourStep[] = [
  {
    targetId: 'nav-dashboard',
    title: 'Tus Binders',
    text: 'Organiza tus cartas en carpetas de intercambio, deseos o subastas. Cada binder tiene su propio multiplicador de precio.',
  },
  {
    targetId: 'nav-market',
    title: 'Market Match',
    text: 'Aquí aparecen automáticamente las personas que tienen lo que buscas. No necesitas buscar — te encontramos.',
  },
  {
    targetId: 'nav-auctions',
    title: 'Casa de Subastas',
    text: 'Subasta tus cartas más valiosas. Si alguien puja en los últimos 5 minutos, el tiempo se extiende.',
  },
  {
    targetId: 'nav-showcase',
    title: 'Vitrina de la Comunidad',
    text: "Las mejores cartas de los mejores traders. Marca tus cartas como 'showcase' para aparecer aquí.",
  },
  {
    targetId: 'nav-profile',
    title: 'Tu Perfil',
    text: 'Tu reputación, tu tienda preferida y tu anuncio público. Comparte tu perfil para que te encuentren.',
  },
  {
    targetId: 'info-btn-home',
    title: '¿Necesitas ayuda?',
    text: 'En cada sección hay un botón ℹ️ que te explica cómo funciona. Púlsalo cuando lo necesites.',
  },
];
