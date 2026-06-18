import { supabase } from './supabase';
import { oneSignalService } from './onesignalService';
import {
  Binder, BinderType, Card, CardCondition, GameType, MatchResult,
  UserProfile, ShowcaseItem, SubscriptionTier, GlobalConfig, AuctionStatus,
  SystemConfig, TradeInteraction, NewsItem, StoreProfile, AppNotification,
  CardAlert, FeedbackValue, InventoryDecision, InventoryDecisionResult,
} from '../types';

// ─── DEFAULTS ────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: GlobalConfig = {
  [SubscriptionTier.COMMON]: {
    maxTradeBinders: 1, maxCardsPerTradeBinder: 20,
    maxWishlistBinders: 1, maxCardsPerWishlistBinder: 20,
    maxAuctionBinders: 1, maxAuctionCardsPerBinder: 1,
    maxShowcaseItems: 3, maxCardAlerts: 1,
    pricePerMonth: 0, currency: 'USD', paymentLink: '',
  },
  [SubscriptionTier.UNCOMMON]: {
    maxTradeBinders: 3, maxCardsPerTradeBinder: 50,
    maxWishlistBinders: 3, maxCardsPerWishlistBinder: 50,
    maxAuctionBinders: 2, maxAuctionCardsPerBinder: 10,
    maxShowcaseItems: 10, maxCardAlerts: 5,
    pricePerMonth: 5, currency: 'USD', paymentLink: '',
  },
  [SubscriptionTier.RARE]: {
    maxTradeBinders: 10, maxCardsPerTradeBinder: 100,
    maxWishlistBinders: 10, maxCardsPerWishlistBinder: 100,
    maxAuctionBinders: 3, maxAuctionCardsPerBinder: 15,
    maxShowcaseItems: 50, maxCardAlerts: 20,
    pricePerMonth: 15, currency: 'USD', paymentLink: '',
  },
  [SubscriptionTier.MYTHIC]: {
    maxTradeBinders: 100, maxCardsPerTradeBinder: 500,
    maxWishlistBinders: 0, maxCardsPerWishlistBinder: 0,
    maxAuctionBinders: 10, maxAuctionCardsPerBinder: 50,
    maxShowcaseItems: 500, maxCardAlerts: 100,
    pricePerMonth: 0, currency: 'USD', paymentLink: '',
  },
};

const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  minTradeConfirmHours: 0,
  maxTradeConfirmHours: 72,
};

// ─── STATE ───────────────────────────────────────────────────────────────────

let currentUserProfile: UserProfile | null = null;
let currentConfig: GlobalConfig = DEFAULT_CONFIG;
let currentSystemConfig: SystemConfig = DEFAULT_SYSTEM_CONFIG;

// ─── MAPPERS ─────────────────────────────────────────────────────────────────

function mapBinderTypeToDb(type: BinderType | string): string {
  const map: Record<string, string> = {
    'For Trade/Sell': 'FOR_TRADE',
    'Wishlist': 'WISHLIST',
    'Personal Collection': 'FOR_TRADE', // DB has no COLLECTION, treated as FOR_TRADE
    'Auction': 'AUCTION',
  };
  return map[type as string] ?? (type as string);
}

function mapDbToBinderType(dbType: string): BinderType {
  const map: Record<string, BinderType> = {
    FOR_TRADE: BinderType.FOR_TRADE,
    WISHLIST: BinderType.WISHLIST,
    COLLECTION: BinderType.COLLECTION,
    AUCTION: BinderType.AUCTION,
  };
  return map[dbType] ?? (dbType as BinderType);
}

function mapConditionToDb(condition: CardCondition | string): string {
  const map: Record<string, string> = {
    'Near Mint': 'NM',
    'Lightly Played': 'LP',
    'Moderately Played': 'MP',
    'Heavily Played': 'HP',
    'Damaged': 'DMG',
  };
  return map[condition as string] ?? condition as string;
}

function mapDbToCondition(dbCondition: string): CardCondition {
  const map: Record<string, CardCondition> = {
    NM: CardCondition.NM,
    LP: CardCondition.LP,
    MP: CardCondition.MP,
    HP: CardCondition.HP,
    DMG: CardCondition.DMG,
  };
  return map[dbCondition] ?? CardCondition.NM;
}

function mapFeedbackToDb(feedback: FeedbackValue): string {
  const map: Record<number, string> = {
    [FeedbackValue.EXCELENTE]: 'EXCELENTE',
    [FeedbackValue.BUENO]: 'BUENO',
    [FeedbackValue.MALO]: 'MALO',
    [FeedbackValue.NO_CONCRETADO]: 'NO_CONCRETADO',
  };
  return map[feedback as number] ?? 'NO_CONCRETADO';
}

function mapDbToFeedback(dbFeedback: string): FeedbackValue {
  const map: Record<string, FeedbackValue> = {
    EXCELENTE: FeedbackValue.EXCELENTE,
    BUENO: FeedbackValue.BUENO,
    MALO: FeedbackValue.MALO,
    NO_CONCRETADO: FeedbackValue.NO_CONCRETADO,
  };
  return map[dbFeedback] ?? FeedbackValue.NO_CONCRETADO;
}

function mapSubscriptionTierToDb(tier: SubscriptionTier): string {
  const map: Record<SubscriptionTier, string> = {
    [SubscriptionTier.COMMON]: 'COMMON',
    [SubscriptionTier.UNCOMMON]: 'UNCOMMON',
    [SubscriptionTier.RARE]: 'RARE',
    [SubscriptionTier.MYTHIC]: 'MYTHIC',
  };
  return map[tier] ?? 'COMMON';
}

function mapDbToSubscriptionTier(dbTier: string): SubscriptionTier {
  const map: Record<string, SubscriptionTier> = {
    COMMON: SubscriptionTier.COMMON,
    UNCOMMON: SubscriptionTier.UNCOMMON,
    RARE: SubscriptionTier.RARE,
    MYTHIC: SubscriptionTier.MYTHIC,
  };
  return map[dbTier] ?? SubscriptionTier.COMMON;
}

function mapGameTypeToDb(game: GameType | string): string {
  const map: Record<string, string> = {
    'Magic: The Gathering': 'MTG',
    'Pokémon': 'POKEMON',
    'Yu-Gi-Oh!': 'YUGIOH',
  };
  return map[game as string] ?? 'MTG';
}

function mapDbToGameType(dbGame: string): GameType {
  const map: Record<string, GameType> = {
    MTG: GameType.MTG,
    POKEMON: GameType.POKEMON,
    YUGIOH: GameType.YUGIOH,
  };
  return map[dbGame] ?? GameType.MTG;
}

function mapToUserProfile(row: any): UserProfile {
  return {
    id: row.id,
    email: row.email || '',
    displayName: row.display_name || 'Unnamed Trader',
    photoURL: row.photo_url || undefined,
    whatsapp: row.whatsapp || undefined,
    preferredStore: row.preferred_store || undefined,
    preferredGame: row.preferred_game ? mapDbToGameType(row.preferred_game) : '',
    storeAnnouncement: row.store_announcement || undefined,
    isOnline: true,
    subscriptionTier: mapDbToSubscriptionTier(row.subscription_tier),
    trialEndsAt: row.trial_ends_at || undefined,
    isAdmin: !!row.is_admin,
    onboardingComplete: row.onboarding_complete ?? false,
    traderScore: row.trader_score || 0,
    searcherScore: row.searcher_score || 0,
  };
}

function mapToBinder(row: any): Binder {
  return {
    id: row.id,
    userId: row.user_id,
    game: mapDbToGameType(row.game),
    type: mapDbToBinderType(row.type),
    name: row.name,
    coverImage: row.cover_image || undefined,
    cardCount: row.card_count || 0,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function mapToCard(row: any): Card {
  return {
    id: row.id,
    binderId: row.binder_id,
    userId: row.user_id,
    scryfallId: row.scryfall_id,
    name: row.name,
    setName: row.set_name,
    collectorNumber: row.collector_number || '',
    imageUrl: row.image_url,
    condition: mapDbToCondition(row.condition),
    isFoil: row.is_foil || false,
    rarity: row.rarity || '',
    price: row.prices?.price_sell_usd ?? row.custom_price ?? undefined,
    customPrice: row.custom_price ?? undefined,
    currency: row.currency ?? undefined,
    purchaseUrl: row.purchase_url ?? undefined,
    addedAt: row.added_at ? new Date(row.added_at).getTime() : Date.now(),
    binderType: row.binder_type ? mapDbToBinderType(row.binder_type) : undefined,
    isShowcase: row.is_showcase || false,
    game: mapDbToGameType(row.game),
    quantity: row.quantity || 1,
    auctionEndDate: row.auction_end_date ? new Date(row.auction_end_date).getTime() : undefined,
    basePrice: row.base_price ?? undefined,
    buyItNowPrice: row.buy_it_now_price ?? undefined,
    currentBid: row.current_bid ?? undefined,
    topBidderId: row.top_bidder_id ?? undefined,
    auctionStatus: (row.auction_status as AuctionStatus) ?? undefined,
    winnerId: row.winner_id ?? undefined,
    sellerName: row.users?.display_name || undefined,
  };
}

function mapToTradeInteraction(row: any): TradeInteraction {
  return {
    id: row.id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    buyerName: row.buyer_name,
    cardName: row.card_name,
    timestamp: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    status: row.status,
    buyerFeedback: row.buyer_feedback != null ? mapDbToFeedback(row.buyer_feedback) : undefined,
    sellerFeedback: row.seller_feedback != null ? mapDbToFeedback(row.seller_feedback) : undefined,
    buyerConfirmedAt: row.buyer_confirmed_at ? new Date(row.buyer_confirmed_at).getTime() : undefined,
    sellerConfirmedAt: row.seller_confirmed_at ? new Date(row.seller_confirmed_at).getTime() : undefined,
    cardId: row.card_id ?? undefined,
    binderId: row.binder_id ?? undefined,
    inventoryUpdated: row.inventory_updated ?? false,
  };
}

function mapToNewsItem(row: any): NewsItem {
  return {
    id: row.id,
    title: row.title,
    imageUrl: row.image_url,
    linkUrl: row.link_url,
    game: mapDbToGameType(row.game),
    date: row.published_at ? new Date(row.published_at).getTime() : (row.date || Date.now()),
    sourceName: row.source_name,
  };
}

function mapToStoreProfile(row: any): StoreProfile {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url,
    websiteUrl: row.website_url,
    mapsUrl: row.maps_url,
    location: row.location,
    games: (row.games || ['MTG']).map(mapDbToGameType),
    linkedUserId: row.linked_user_id ?? undefined,
    eventsImageUrl: row.events_image_url ?? undefined,
  };
}

function mapToNotification(row: any): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    linkUrl: row.link_url ?? undefined,
    imageUrl: row.image_url ?? undefined,
    read: row.read || false,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

// ─── INTERNAL HELPERS ────────────────────────────────────────────────────────

function isGuestId(userId: string): boolean {
  return userId.startsWith('guest_') || localStorage.getItem('lotus_is_guest') === 'true';
}

function assertAuthenticated(userId?: string): void {
  if (!userId || isGuestId(userId)) {
    throw new Error('Necesitás iniciar sesión para realizar esta acción.');
  }
}

function buildGuestProfile(guestId: string): UserProfile {
  return {
    id: guestId,
    email: 'guest@lotus.test',
    displayName: 'Guest Trader',
    photoURL: undefined,
    isOnline: true,
    subscriptionTier: SubscriptionTier.COMMON,
    isAdmin: false,
    traderScore: 0,
    searcherScore: 0,
    preferredGame: '',
  };
}

// Direct REST fetch that bypasses supabase-js initializePromise queue.
// Use for any operation that hangs in the admin panel (same root cause as updateProfile).
function getDirectFetchHeaders() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
  let accessToken = anonKey;
  try {
    const raw = localStorage.getItem(`sb-${projectRef}-auth-token`);
    if (raw) { const p = JSON.parse(raw); accessToken = p?.access_token ?? anonKey; }
  } catch { /* fall back to anon key */ }
  return { supabaseUrl, anonKey, accessToken };
}

async function directGet<T>(table: string, query: string): Promise<T[]> {
  const { supabaseUrl, anonKey, accessToken } = getDirectFetchHeaders();
  const url = `${supabaseUrl}/rest/v1/${table}?${query}`;
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error((errBody as any).message || `HTTP ${res.status}`);
    }
    return res.json();
  } finally {
    clearTimeout(tid);
  }
}

async function directFetch(
  method: 'POST' | 'PATCH' | 'DELETE',
  table: string,
  body: Record<string, any> | null,
  filter?: string
): Promise<void> {
  const { supabaseUrl, anonKey, accessToken } = getDirectFetchHeaders();
  const url = `${supabaseUrl}/rest/v1/${table}${filter ? `?${filter}` : ''}`;
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'return=minimal',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error((errBody as any).message || (errBody as any).hint || `HTTP ${res.status}`);
    }
  } finally {
    clearTimeout(tid);
  }
}

async function directInsert<T>(table: string, body: Record<string, any>): Promise<T> {
  const { supabaseUrl, anonKey, accessToken } = getDirectFetchHeaders();
  const url = `${supabaseUrl}/rest/v1/${table}`;
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'return=representation',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error((errBody as any).message || (errBody as any).hint || `HTTP ${res.status}`);
    }
    const rows = await res.json();
    return Array.isArray(rows) ? rows[0] : rows;
  } finally {
    clearTimeout(tid);
  }
}

async function getOrCreateProfile(authUser: any): Promise<UserProfile> {
  const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single();
  if (data) {
    const updates: Record<string, any> = { last_login: new Date().toISOString() };
    const freshPhoto = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;
    if (!data.photo_url && freshPhoto) updates.photo_url = freshPhoto;
    await supabase.from('users').update(updates).eq('id', authUser.id);
    if (!data.photo_url && freshPhoto) data.photo_url = freshPhoto;
    return mapToUserProfile(data);
  }
  // Trigger may not have fired yet — wait and retry once
  await new Promise(r => setTimeout(r, 1000));
  const { data: retryData } = await supabase.from('users').select('*').eq('id', authUser.id).single();
  if (retryData) return mapToUserProfile(retryData);
  // Last resort: insert manually (trigger didn't fire)
  const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const fallback = {
    id: authUser.id,
    email: authUser.email || '',
    display_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Unnamed Trader',
    photo_url: authUser.user_metadata?.avatar_url || null,
    subscription_tier: 'UNCOMMON',
    trial_ends_at: trialEndsAt,
    is_admin: false,
    trader_score: 0,
    searcher_score: 0,
  };
  await supabase.from('users').insert(fallback);
  return mapToUserProfile(fallback);
}

// ─── AUTH SERVICE ─────────────────────────────────────────────────────────────

export const auth = {
  login: async (): Promise<UserProfile> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    // Page redirects to Google; return value is never used
    return {} as UserProfile;
  },

  loginAsGuest: async (): Promise<UserProfile> => {
    const guestId = localStorage.getItem('lotus_guest_id') || 'guest_' + Math.floor(Math.random() * 10000);
    localStorage.setItem('lotus_guest_id', guestId);
    localStorage.setItem('lotus_is_guest', 'true');
    const guestProfile = buildGuestProfile(guestId);
    currentUserProfile = guestProfile;
    await configService.loadConfig();
    return guestProfile;
  },

  getCurrentUser: () => currentUserProfile,

  getUserPublicProfile: async (userId: string): Promise<UserProfile | null> => {
    try {
      const rows = await directGet<any>('users', `id=eq.${userId}&limit=1`);
      return rows[0] ? mapToUserProfile(rows[0]) : null;
    } catch (e) {
      console.error('[getUserPublicProfile] error:', e);
      return null;
    }
  },

  updateProfile: async (updates: Partial<UserProfile>): Promise<void> => {
    const current = currentUserProfile;
    if (!current) throw new Error('No user logged in');
    if (localStorage.getItem('lotus_is_guest') === 'true') {
      currentUserProfile = { ...current, ...updates };
      return;
    }

    // Bypass supabase-js entirely — it queues requests behind initializePromise
    // which can hang when the session refresh request never completes.
    // Read the JWT directly from localStorage (where supabase-js v2 persists it).
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
    const storageKey = `sb-${projectRef}-auth-token`;
    let accessToken = anonKey;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        accessToken = parsed?.access_token ?? anonKey;
      }
    } catch { /* fall back to anon key */ }

    console.log('[updateProfile] direct fetch — user:', current.id);
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 9000);
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/users?id=eq.${encodeURIComponent(current.id)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: anonKey,
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            display_name: updates.displayName ?? current.displayName,
            whatsapp: updates.whatsapp || null,
            preferred_store: updates.preferredStore || null,
            preferred_game: updates.preferredGame ? mapGameTypeToDb(updates.preferredGame) : null,
            store_announcement: updates.storeAnnouncement || null,
            ...(updates.onboardingComplete !== undefined && { onboarding_complete: updates.onboardingComplete }),
          }),
          signal: controller.signal,
        }
      );
      console.log('[updateProfile] response status:', res.status);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('[updateProfile] error body:', JSON.stringify(body));
        throw new Error((body as any).message || (body as any).hint || `HTTP ${res.status}`);
      }
    } finally {
      clearTimeout(tid);
    }

    currentUserProfile = { ...current, ...updates };
  },

  logout: async () => {
    localStorage.removeItem('lotus_is_guest');
    await supabase.auth.signOut();
    currentUserProfile = null;
  },

  subscribe: (callback: (user: UserProfile | null) => void) => {
    // Synchronously bootstrap currentUserProfile from localStorage so that
    // getCurrentUser() returns non-null immediately on hard refresh, before
    // the async getSession() resolves. Without this, components that call
    // getCurrentUser() on mount (e.g. Binders.tsx) get null and their
    // loading state never resolves.
    if (!currentUserProfile && localStorage.getItem('lotus_is_guest') !== 'true') {
      try {
        const projectRef = (import.meta.env.VITE_SUPABASE_URL as string)
          .replace('https://', '').replace('.supabase.co', '');
        const raw = localStorage.getItem(`sb-${projectRef}-auth-token`);
        if (raw) {
          const parsed = JSON.parse(raw);
          const u = parsed?.user;
          if (u?.id) {
            currentUserProfile = {
              id: u.id,
              email: u.email || '',
              displayName: u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
              photoURL: u.user_metadata?.avatar_url || undefined,
              whatsapp: undefined,
              preferredStore: undefined,
              preferredGame: '',
              storeAnnouncement: undefined,
              isOnline: true,
              subscriptionTier: SubscriptionTier.COMMON,
              isAdmin: false,
              traderScore: 0,
              searcherScore: 0,
            };
          }
        }
      } catch { /* ignore — full profile loads async below */ }
    }

    // Safety valve: if the entire init chain hangs, unblock the app after 30s.
    // IMPORTANT: we do NOT wipe tokens here. The old 10s wipe caused permanent
    // logouts when the browser throttled timers in background tabs — the SDK was
    // still initializing but the safety fired first and destroyed the session.
    // If the page is currently hidden, skip entirely (we're throttled, not hung).
    const _authSafety = setTimeout(() => {
      if (document.visibilityState === 'hidden') return;
      console.warn('[auth] initialization timed out — showing login (session preserved)');
      callback(null);
    }, 30000);

    // Single source of truth for auth state: onAuthStateChange with INITIAL_SESSION.
    // We no longer call getSession() separately — that created a race condition where
    // TOKEN_REFRESHED would fire callback(profile) and then getSession().then() could
    // fire callback(null), causing a Home→Login flash.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // TOKEN_REFRESHED is a silent internal update — not a user state change.
      // Ignoring it here prevents a double-callback when we call refreshSession() below.
      if (event === 'TOKEN_REFRESHED') return;

      if (event === 'INITIAL_SESSION') {
        try {
          let profile: UserProfile | null = null;
          if (session?.user) {
            let activeSession = session;
            const nowSec = Math.floor(Date.now() / 1000);
            const tokenExpired = !!session.expires_at && session.expires_at < nowSec;
            const tokenNearExpiry = !!session.expires_at && session.expires_at < nowSec + 60;
            if (tokenNearExpiry) {
              try {
                const result = await Promise.race([
                  supabase.auth.refreshSession({ refresh_token: session.refresh_token }),
                  new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('refresh timeout')), 8000)
                  ),
                ]);
                if (result.data?.session) {
                  activeSession = result.data.session;
                } else if (tokenExpired) {
                  // Truly expired AND refresh returned nothing — must re-login
                  clearTimeout(_authSafety);
                  callback(null);
                  return;
                }
                // Near-expiry but refresh returned null: proceed, token still valid briefly
              } catch {
                if (tokenExpired) {
                  // Truly expired AND refresh timed out — must re-login
                  clearTimeout(_authSafety);
                  callback(null);
                  return;
                }
                // Near-expiry refresh failed but token still technically valid — let user in
                // visibilitychange handler will retry the refresh when the tab is next focused
              }
            }
            profile = await getOrCreateProfile(activeSession.user);
            currentUserProfile = profile;
            await configService.loadConfig();
          } else if (localStorage.getItem('lotus_is_guest') === 'true') {
            const guestId = localStorage.getItem('lotus_guest_id') || 'guest';
            profile = buildGuestProfile(guestId);
            currentUserProfile = profile;
            await configService.loadConfig();
          } else {
            currentUserProfile = null;
          }
          clearTimeout(_authSafety);
          callback(profile);
        } catch (e) {
          console.error('[auth] init error', e);
          clearTimeout(_authSafety);
          callback(null);
        }
        return;
      }

      // Post-init events: SIGNED_IN, SIGNED_OUT, USER_UPDATED
      if (session?.user) {
        const profile = await getOrCreateProfile(session.user);
        currentUserProfile = profile;
        await configService.loadConfig();
        callback(profile);
      } else {
        if (event === 'SIGNED_OUT') {
          if (localStorage.getItem('lotus_is_guest') === 'true') {
            callback(currentUserProfile);
          } else {
            currentUserProfile = null;
            callback(null);
          }
        }
      }
    });

    // Refresh the token when the user returns to the tab after a long absence.
    // With autoRefreshToken: false there is no background refresh — this handles
    // the case where the access token expires while the tab is open but idle.
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        const nowSec = Math.floor(Date.now() / 1000);
        if (session.expires_at && session.expires_at < nowSec + 300) {
          supabase.auth.refreshSession({ refresh_token: session.refresh_token }).catch(() => {});
        }
      }).catch(() => {});
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  },
};

// ─── CONFIG SERVICE ───────────────────────────────────────────────────────────

export const configService = {
  loadConfig: async () => {
    try {
      const globalRows = await directGet<any>('settings', 'key=eq.global_config&select=value&limit=1');
      if (globalRows[0]?.value) {
        const data = globalRows[0].value as GlobalConfig;
        const mergeTier = (tier: SubscriptionTier) => ({
          ...DEFAULT_CONFIG[tier],
          ...(data[tier] || {}),
        });
        currentConfig = {
          [SubscriptionTier.COMMON]: mergeTier(SubscriptionTier.COMMON),
          [SubscriptionTier.UNCOMMON]: mergeTier(SubscriptionTier.UNCOMMON),
          [SubscriptionTier.RARE]: mergeTier(SubscriptionTier.RARE),
          [SubscriptionTier.MYTHIC]: mergeTier(SubscriptionTier.MYTHIC),
        };
      } else {
        currentConfig = DEFAULT_CONFIG;
      }

      const sysRows = await directGet<any>('settings', 'key=eq.system_config&select=value&limit=1');
      if (sysRows[0]?.value) {
        currentSystemConfig = { ...DEFAULT_SYSTEM_CONFIG, ...(sysRows[0].value as SystemConfig) };
      } else {
        currentSystemConfig = DEFAULT_SYSTEM_CONFIG;
      }
    } catch (e) {
      console.warn('Using default config (offline)', e);
      currentConfig = DEFAULT_CONFIG;
      currentSystemConfig = DEFAULT_SYSTEM_CONFIG;
    }
    return currentConfig;
  },

  getConfig: () => currentConfig,
  getSystemConfig: () => currentSystemConfig,

  updateConfig: async (newConfig: GlobalConfig) => {
    const { supabaseUrl, anonKey, accessToken } = getDirectFetchHeaders();
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 9000);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({ key: 'global_config', value: newConfig }),
        signal: controller.signal,
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).message || `HTTP ${res.status}`); }
      currentConfig = newConfig;
    } finally { clearTimeout(tid); }
  },

  updateSystemConfig: async (newSysConfig: SystemConfig) => {
    const { supabaseUrl, anonKey, accessToken } = getDirectFetchHeaders();
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 9000);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({ key: 'system_config', value: newSysConfig }),
        signal: controller.signal,
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).message || `HTTP ${res.status}`); }
      currentSystemConfig = newSysConfig;
    } finally { clearTimeout(tid); }
  },
};

// ─── NOTIFICATION SERVICE ─────────────────────────────────────────────────────

export const notificationService = {
  send: async (
    userId: string,
    type: 'OUTBID' | 'WISH_ALERT' | 'SYSTEM',
    title: string,
    message: string,
    linkUrl?: string,
    imageUrl?: string,
  ) => {
    try {
      await directFetch('POST', 'notifications', {
        user_id: userId,
        type,
        title,
        message,
        link_url: linkUrl ?? null,
        image_url: imageUrl ?? null,
        read: false,
      });
    } catch (e) {
      console.error('Failed to send notification', e);
    }
  },

  markAsRead: async (notificationId: string) => {
    await directFetch('PATCH', 'notifications', { read: true }, `id=eq.${notificationId}`);
  },

  markAllAsRead: async (userId: string) => {
    await directFetch('PATCH', 'notifications', { read: true }, `user_id=eq.${userId}&read=eq.false`);
  },

  cleanup: async (userId: string) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await directFetch('DELETE', 'notifications', null, `user_id=eq.${userId}&created_at=lt.${thirtyDaysAgo}`);
  },
};

// ─── ALERT SERVICE ────────────────────────────────────────────────────────────

export const alertService = {
  isWatching: async (userId: string, cardName: string): Promise<boolean> => {
    const rows = await directGet<{user_id: string}>('card_alerts', `user_id=eq.${userId}&card_name=eq.${encodeURIComponent(cardName)}&select=user_id`);
    return rows.length > 0;
  },

  toggleAlert: async (userId: string, cardName: string): Promise<boolean> => {
    assertAuthenticated(userId);
    const watching = await alertService.isWatching(userId, cardName);
    if (watching) {
      await directFetch('DELETE', 'card_alerts', null, `user_id=eq.${userId}&card_name=eq.${encodeURIComponent(cardName)}`);
      return false;
    }
    const limits = await subscriptionService.checkLimit('CARD_ALERT');
    if (!limits.allowed) throw new Error(`Alert limit reached (${limits.limit}). Upgrade your plan to track more cards.`);
    await directFetch('POST', 'card_alerts', { user_id: userId, card_name: cardName });
    return true;
  },

  findWatchers: async (cardName: string): Promise<string[]> => {
    const rows = await directGet<{user_id: string}>('card_alerts', `card_name=eq.${encodeURIComponent(cardName)}&select=user_id`);
    return rows.map((r) => r.user_id);
  },
};

// ─── TRADE SERVICE ────────────────────────────────────────────────────────────


export const tradeService = {
  logInteraction: async (sellerId: string, sellerName: string, cardName: string = 'General Inquiry', cardId?: string, binderId?: string) => {
    if (!currentUserProfile) return;
    if (isGuestId(currentUserProfile.id)) return;
    if (currentUserProfile.id === sellerId) return;

    try {
      // Dedup: no PENDING en últimas 24h para este par
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentPending = await directGet<{ id: string }>(
        'trade_interactions',
        `buyer_id=eq.${currentUserProfile.id}&seller_id=eq.${sellerId}&status=eq.PENDING&created_at=gte.${encodeURIComponent(since24h)}&limit=1`
      );
      if (recentPending.length > 0) return;

      // Cooldown: no feedback completado (COMPLETED) en últimos 7 días para este par
      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const recentCompleted = await directGet<{ id: string }>(
        'trade_interactions',
        `buyer_id=eq.${currentUserProfile.id}&seller_id=eq.${sellerId}&status=eq.COMPLETED&created_at=gte.${encodeURIComponent(since7d)}&limit=1`
      );
      if (recentCompleted.length > 0) return;

      await directFetch('POST', 'trade_interactions', {
        buyer_id: currentUserProfile.id,
        buyer_name: currentUserProfile.displayName,
        seller_id: sellerId,
        seller_name: sellerName,
        card_name: cardName,
        card_id: cardId ?? null,
        binder_id: binderId ?? null,
        status: 'PENDING',
      });

      oneSignalService.sendNotification(
        '¡Atención!',
        `Un Searcher te ha contactado por tu ${cardName}.`,
        [sellerId],
      ).catch(err => console.error('Push Notification Failed', err));
    } catch (e) {
      console.error('[logInteraction] failed', e);
    }
  },

  getPendingFeedback: async (): Promise<TradeInteraction[]> => {
    if (!currentUserProfile) return [];
    const uid = currentUserProfile.id;
    try {
      const rows = await directGet<any>(
        'trade_interactions',
        `or=(buyer_id.eq.${uid},seller_id.eq.${uid})&status=eq.PENDING`
      );
      const all = rows.map(mapToTradeInteraction);
      const now = Date.now();
      const minHours = currentSystemConfig?.minTradeConfirmHours ?? 0;
      const minTime = minHours * 60 * 60 * 1000;
      return all.filter(i => {
        if (i.buyerId === uid && i.buyerFeedback !== undefined) return false;
        if (i.sellerId === uid && i.sellerFeedback !== undefined) return false;
        return (now - i.timestamp) >= minTime;
      });
    } catch (e) {
      console.error('Failed to get pending feedback', e);
      return [];
    }
  },

  submitFeedback: async (interactionId: string, feedback: FeedbackValue) => {
    if (!currentUserProfile) return;
    await directFetch('POST', 'rpc/submit_feedback', {
      p_interaction_id: interactionId,
      p_user_id: currentUserProfile.id,
      p_feedback: mapFeedbackToDb(feedback),
    });
  },

  dismissFeedback: async (interactionId: string) => {
    await directFetch('PATCH', 'trade_interactions', { status: 'IGNORED' }, `id=eq.${interactionId}`);
  },

  getInventoryPendingDecisions: async (): Promise<InventoryDecision[]> => {
    if (!currentUserProfile) return [];
    const uid = currentUserProfile.id;
    try {
      const rows = await directGet<any>(
        'trade_interactions',
        `seller_id=eq.${uid}&card_id=not.is.null&inventory_updated=eq.false&select=id,card_id,card_name,buyer_name,seller_feedback`
      );
      // Only completed trades — exclude NO_CONCRETADO and null (no feedback yet)
      const completed = rows.filter((r: any) =>
        r.seller_feedback && r.seller_feedback !== 'NO_CONCRETADO'
      );
      if (completed.length === 0) return [];

      const cardIds = completed.map((r: any) => r.card_id).join(',');
      const cards = await directGet<any>('cards', `id=in.(${cardIds})&select=id,name,set_name,binder_id`);
      const cardMap = new Map<string, any>(cards.map((c: any) => [c.id, c]));

      const binderIdSet = new Set(cards.map((c: any) => c.binder_id).filter(Boolean));
      let binderMap = new Map<string, string>();
      if (binderIdSet.size > 0) {
        const binders = await directGet<any>('binders', `id=in.(${[...binderIdSet].join(',')})&select=id,name`);
        binderMap = new Map(binders.map((b: any) => [b.id, b.name]));
      }

      return completed.map((r: any) => {
        const card = cardMap.get(r.card_id);
        return {
          interactionId: r.id,
          cardId: r.card_id,
          cardName: r.card_name || (card?.name ?? ''),
          setName: card?.set_name || '',
          binderName: card ? (binderMap.get(card.binder_id) || '') : '',
          buyerName: r.buyer_name,
          cardExists: !!card,
        };
      });
    } catch (e) {
      console.error('[getInventoryPendingDecisions] error:', e);
      return [];
    }
  },

  decrementInventory: async (interactionId: string, cardId: string): Promise<InventoryDecisionResult> => {
    const rows = await directGet<any>('cards', `id=eq.${cardId}&select=id,quantity&limit=1`);
    // Mark inventory_updated regardless of outcome so this prompt never reappears
    const markDone = () => directFetch('PATCH', 'trade_interactions', { inventory_updated: true }, `id=eq.${interactionId}`);
    if (rows.length === 0) {
      await markDone().catch(() => {});
      return { status: 'not_found' };
    }
    const qty: number = rows[0].quantity;
    if (qty > 1) {
      await directFetch('PATCH', 'cards', { quantity: qty - 1 }, `id=eq.${cardId}`);
      await markDone();
      return { status: 'decremented', remaining: qty - 1 };
    } else {
      await directFetch('DELETE', 'cards', null, `id=eq.${cardId}`);
      await markDone();
      return { status: 'deleted' };
    }
  },
};

// ─── SUBSCRIPTION SERVICE ─────────────────────────────────────────────────────

export const subscriptionService = {
  upgradeUser: async (tier: SubscriptionTier) => {
    const user = currentUserProfile;
    if (!user) return;
    if (localStorage.getItem('lotus_is_guest') !== 'true') {
      await directFetch('PATCH', 'users', { subscription_tier: mapSubscriptionTierToDb(tier) }, `id=eq.${user.id}`);
    }
    currentUserProfile = { ...user, subscriptionTier: tier };
  },

  checkLimit: async (
    type: 'TRADE_BINDER' | 'WISHLIST_BINDER' | 'SHOWCASE_ITEM' | 'AUCTION_BINDER' | 'AUCTION_CARD' | 'TRADE_CARD' | 'WISHLIST_CARD' | 'CARD_ALERT',
    binderId?: string,
  ): Promise<{ allowed: boolean; limit: number; current: number }> => {
    if (!currentUserProfile) return { allowed: false, limit: 0, current: 0 };
    const tier = currentUserProfile.subscriptionTier;
    const limits = currentConfig[tier] || DEFAULT_CONFIG[tier];

    if (type === 'TRADE_BINDER') {
      const binders = await binderService.getUserBinders(currentUserProfile.id);
      const count = binders.filter(b => b.type === BinderType.FOR_TRADE || b.type === BinderType.COLLECTION).length;
      return { allowed: count < limits.maxTradeBinders, limit: limits.maxTradeBinders, current: count };
    }
    if (type === 'WISHLIST_BINDER') {
      const binders = await binderService.getUserBinders(currentUserProfile.id);
      const count = binders.filter(b => b.type === BinderType.WISHLIST).length;
      return { allowed: count < limits.maxWishlistBinders, limit: limits.maxWishlistBinders, current: count };
    }
    if (type === 'AUCTION_BINDER') {
      const binders = await binderService.getUserBinders(currentUserProfile.id);
      const count = binders.filter(b => b.type === BinderType.AUCTION).length;
      return { allowed: count < limits.maxAuctionBinders, limit: limits.maxAuctionBinders, current: count };
    }
    if ((type === 'AUCTION_CARD' || type === 'TRADE_CARD' || type === 'WISHLIST_CARD') && binderId) {
      const cards = await cardService.getCardsInBinder(binderId);
      let limit = 0;
      if (type === 'AUCTION_CARD') limit = limits.maxAuctionCardsPerBinder;
      if (type === 'TRADE_CARD') limit = limits.maxCardsPerTradeBinder;
      if (type === 'WISHLIST_CARD') limit = limits.maxCardsPerWishlistBinder;
      return { allowed: cards.length < limit, limit, current: cards.length };
    }
    if (type === 'SHOWCASE_ITEM') {
      const rows = await directGet<{id: string}>('cards', `user_id=eq.${currentUserProfile.id}&is_showcase=eq.true&select=id`);
      const current = rows.length;
      return { allowed: current < limits.maxShowcaseItems, limit: limits.maxShowcaseItems, current };
    }
    if (type === 'CARD_ALERT') {
      const rows = await directGet<{user_id: string}>('card_alerts', `user_id=eq.${currentUserProfile.id}&select=user_id`);
      const current = rows.length;
      return { allowed: current < limits.maxCardAlerts, limit: limits.maxCardAlerts, current };
    }
    return { allowed: true, limit: 999, current: 0 };
  },

  isBinderLocked: async (binder: Binder): Promise<boolean> => {
    if (!currentUserProfile) return false;
    if (binder.userId !== currentUserProfile.id) return false;
    const allBinders = await binderService.getUserBinders(currentUserProfile.id);
    const tier = currentUserProfile.subscriptionTier;
    const config = currentConfig[tier] || DEFAULT_CONFIG[tier];
    let categoryBinders: Binder[];
    let limit: number;
    if (binder.type === BinderType.AUCTION) {
      categoryBinders = allBinders.filter(b => b.type === BinderType.AUCTION);
      limit = config.maxAuctionBinders;
    } else if (binder.type === BinderType.WISHLIST) {
      categoryBinders = allBinders.filter(b => b.type === BinderType.WISHLIST);
      limit = config.maxWishlistBinders;
    } else {
      categoryBinders = allBinders.filter(b => b.type === BinderType.FOR_TRADE || b.type === BinderType.COLLECTION);
      limit = config.maxTradeBinders;
    }
    categoryBinders.sort((a, b) => a.createdAt - b.createdAt);
    const index = categoryBinders.findIndex(b => b.id === binder.id);
    return index >= limit;
  },
};

// ─── ADMIN SERVICE ────────────────────────────────────────────────────────────

export const adminService = {
  assignTierByEmail: async (email: string, tier: SubscriptionTier, expiresAt?: string) => {
    const updates: Record<string, any> = { subscription_tier: mapSubscriptionTierToDb(tier) };
    if (expiresAt) updates.trial_ends_at = new Date(expiresAt).toISOString();
    else updates.trial_ends_at = null; // clear expiry when assigning permanently
    await directFetch('PATCH', 'users', updates, `email=eq.${encodeURIComponent(email)}`);
    return true;
  },

  wipeDatabase: async () => {
    // Requires service_role — execute from server-side or Edge Function
    console.warn('wipeDatabase: not available from client. Use Supabase dashboard or Edge Function.');
  },

  getUserDisplayNames: async (ids: string[]): Promise<Record<string, string>> => {
    if (ids.length === 0) return {};
    try {
      const rows = await directGet<{ id: string; display_name: string }>(
        'users',
        `id=in.(${ids.join(',')})&select=id,display_name`,
      );
      return Object.fromEntries(rows.map(r => [r.id, r.display_name || 'Desconocido']));
    } catch {
      return {};
    }
  },

  getWishlistUserIds: async (): Promise<string[]> => {
    try {
      const rows = await directGet<{ user_id: string }>('binders', 'type=eq.WISHLIST&select=user_id');
      return [...new Set(rows.map(r => r.user_id))];
    } catch {
      return [];
    }
  },

  getActiveBidderIds: async (): Promise<string[]> => {
    try {
      const rows = await directGet<{ top_bidder_id: string }>(
        'cards',
        'binder_type=eq.AUCTION&auction_status=eq.ACTIVE&top_bidder_id=not.is.null&select=top_bidder_id',
      );
      return [...new Set(rows.map(r => r.top_bidder_id).filter(Boolean))];
    } catch {
      return [];
    }
  },
};

// ─── BINDER SERVICE ───────────────────────────────────────────────────────────

export const binderService = {
  getUserBinders: async (userId: string): Promise<Binder[]> => {
    if (isGuestId(userId)) return [];
    try {
      const data = await directGet<any>('binders', `user_id=eq.${userId}&order=created_at.asc`);
      return data.map(mapToBinder);
    } catch {
      return [];
    }
  },

  getBinder: async (binderId: string): Promise<Binder | null> => {
    try {
      const rows = await directGet<any>('binders', `id=eq.${binderId}&limit=1`);
      return rows[0] ? mapToBinder(rows[0]) : null;
    } catch {
      return null;
    }
  },

  createBinder: async (binderData: Omit<Binder, 'id' | 'createdAt' | 'cardCount'>): Promise<Binder> => {
    assertAuthenticated(binderData.userId);
    const data = await directInsert<any>('binders', {
      user_id: binderData.userId,
      game: mapGameTypeToDb(binderData.game || GameType.MTG),
      type: mapBinderTypeToDb(binderData.type),
      name: binderData.name,
      cover_image: binderData.coverImage ?? null,
      card_count: 0,
    });
    return mapToBinder(data);
  },

  deleteBinder: async (binderId: string) => {
    // CASCADE delete of cards handled by FK in Postgres
    await directFetch('DELETE', 'binders', null, `id=eq.${binderId}`);
  },
};

// Fetches prices for a set of card rows and merges them in.
// Used instead of a JOIN because prices has no FK to cards.
async function attachPrices(rows: any[]): Promise<any[]> {
  const ids = [...new Set(rows.map((r: any) => r.scryfall_id).filter(Boolean))];
  if (ids.length === 0) return rows;
  try {
    const prices = await directGet<any>(
      'prices',
      `select=scryfall_id,price_sell_usd,price_buy_usd&scryfall_id=in.(${ids.join(',')})`
    );
    const map = new Map(prices.map((p: any) => [p.scryfall_id, {
      price_sell_usd: p.price_sell_usd,
      price_buy_usd: p.price_buy_usd,
    }]));
    return rows.map((r: any) => ({ ...r, prices: map.get(r.scryfall_id) ?? null }));
  } catch (e) {
    console.warn('[attachPrices] failed:', e);
    return rows;
  }
}

// ─── CARD SERVICE ─────────────────────────────────────────────────────────────

export const cardService = {
  getCardsInBinder: async (binderId: string): Promise<Card[]> => {
    try {
      const data = await directGet<any>('cards', `binder_id=eq.${binderId}&order=added_at.desc`);
      const rows = await attachPrices(data);
      return rows.map(mapToCard);
    } catch {
      return [];
    }
  },

  getTraderInventory: async (userId: string): Promise<Card[]> => {
    const run = async (): Promise<Card[]> => {
      try {
        console.log('[getTraderInventory] start — user:', userId);
        // Use cached profile for own user to avoid a redundant users-table SELECT
        const isOwnProfile = currentUserProfile?.id === userId;
        const userProfile = isOwnProfile && currentUserProfile
          ? currentUserProfile
          : await auth.getUserPublicProfile(userId);
        if (!userProfile) return [];
        const tier = userProfile.subscriptionTier;
        const limits = currentConfig[tier] || DEFAULT_CONFIG[tier];

        const bindersData = await directGet<{ id: string }>(
          'binders',
          `user_id=eq.${userId}&type=eq.FOR_TRADE&order=created_at.asc&select=id`
        );

        const activeBinders = bindersData.slice(0, limits.maxTradeBinders);
        if (activeBinders.length === 0) return [];
        const activeBinderIds = activeBinders.map((b: any) => b.id);

        const cards = await directGet<any>(
          'cards',
          `binder_id=in.(${activeBinderIds.join(',')})`
        );
        console.log('[getTraderInventory] done — cards:', cards.length);
        const rows = await attachPrices(cards);
        return rows.map(mapToCard);
      } catch (e) {
        console.error('[getTraderInventory] error:', e);
        return [];
      }
    };
    let timeoutId!: ReturnType<typeof setTimeout>;
    const timeout = new Promise<Card[]>(resolve => {
      timeoutId = setTimeout(() => { console.warn('[getTraderInventory] timed out'); resolve([]); }, 10000);
    });
    const result = await Promise.race([run(), timeout]);
    clearTimeout(timeoutId);
    return result;
  },

  // Bulk insert — skips per-card limit checks and alert triggers.
  // Caller is responsible for pre-validating slot availability.
  bulkAddCard: async (cardData: {
    binderId: string;
    userId: string;
    binderType: BinderType;
    scryfallId: string;
    name: string;
    setName: string;
    collectorNumber: string;
    imageUrl: string;
    rarity: string;
    game: GameType | string;
    condition: CardCondition;
    isFoil: boolean;
    quantity: number;
    purchaseUrl?: string;
  }): Promise<void> => {
    assertAuthenticated(cardData.userId);
    await directFetch('POST', 'cards', {
      binder_id: cardData.binderId,
      user_id: cardData.userId,
      scryfall_id: cardData.scryfallId,
      name: cardData.name,
      set_name: cardData.setName,
      collector_number: cardData.collectorNumber || '',
      image_url: cardData.imageUrl,
      rarity: cardData.rarity || '',
      game: mapGameTypeToDb(cardData.game || GameType.MTG),
      condition: mapConditionToDb(cardData.condition),
      is_foil: cardData.isFoil,
      quantity: cardData.quantity,
      custom_price: null,
      currency: null,
      binder_type: mapBinderTypeToDb(cardData.binderType),
      purchase_url: cardData.purchaseUrl ?? null,
      is_showcase: false,
    });
  },

  addCard: async (cardData: Omit<Card, 'id' | 'addedAt'>): Promise<Card> => {
    assertAuthenticated(cardData.userId);
    // Check binder limits
    if (currentUserProfile) {
      const binder = await binderService.getBinder(cardData.binderId);
      if (binder) {
        const tier = currentUserProfile.subscriptionTier;
        const limits = currentConfig[tier] || DEFAULT_CONFIG[tier];
        const isAuction = binder.type === BinderType.AUCTION;
        const isWishlist = binder.type === BinderType.WISHLIST;
        const maxCards = isAuction
          ? limits.maxAuctionCardsPerBinder
          : isWishlist
          ? limits.maxCardsPerWishlistBinder
          : limits.maxCardsPerTradeBinder;
        const currentCards = await cardService.getCardsInBinder(cardData.binderId);
        if (currentCards.length >= maxCards) throw new Error(`Limit reached for this binder type. Max ${maxCards} cards.`);
      }
    }

    // Infer binderType from the binder if not explicitly provided
    let resolvedBinderType = cardData.binderType;
    if (!resolvedBinderType && cardData.binderId) {
      const b = await binderService.getBinder(cardData.binderId);
      if (b) resolvedBinderType = b.type;
    }
    const binderTypeDb = resolvedBinderType ? mapBinderTypeToDb(resolvedBinderType) : null;
    const isAuction = binderTypeDb === 'AUCTION';

    const data = await directInsert<any>('cards', {
      binder_id: cardData.binderId,
      user_id: cardData.userId,
      scryfall_id: cardData.scryfallId,
      name: cardData.name,
      set_name: cardData.setName,
      collector_number: cardData.collectorNumber,
      image_url: cardData.imageUrl,
      rarity: cardData.rarity,
      condition: mapConditionToDb(cardData.condition || CardCondition.NM),
      is_foil: cardData.isFoil || false,
      quantity: isAuction ? 1 : (cardData.quantity || 1),
      custom_price: cardData.customPrice ?? null,
      currency: cardData.currency ?? null,
      binder_type: binderTypeDb,
      purchase_url: cardData.purchaseUrl ?? null,
      game: mapGameTypeToDb(cardData.game || GameType.MTG),
      is_showcase: false,
      base_price: cardData.basePrice ?? null,
      buy_it_now_price: cardData.buyItNowPrice ?? null,
      current_bid: cardData.basePrice ?? 0,
      auction_status: isAuction ? (cardData.auctionStatus || AuctionStatus.ACTIVE).toString() : null,
      auction_end_date: cardData.auctionEndDate ? new Date(cardData.auctionEndDate).toISOString() : null,
    });

    // Trigger alerts for watchers
    const isTradeable = !binderTypeDb || binderTypeDb === 'FOR_TRADE' || binderTypeDb === 'AUCTION';
    if (isTradeable) {
      alertService.findWatchers(cardData.name).then(watcherIds => {
        watcherIds.forEach(uid => {
          if (uid !== cardData.userId) {
            notificationService.send(uid, 'WISH_ALERT', `Found: ${cardData.name}`, `${currentUserProfile?.displayName} just listed a card on your wishlist!`, `/?binder=${cardData.binderId}`, cardData.imageUrl);
          }
        });
      }).catch(e => console.error('Error triggering alerts', e));
    }

    return mapToCard(data);
  },

  updatePrice: async (cardId: string, customPrice: number, currency: 'USD' | 'PEN') => {
    await directFetch('PATCH', 'cards', { custom_price: customPrice, currency }, `id=eq.${cardId}`);
  },

  syncBinderPrices: async (_binderId: string, cards: Card[]) => {
    const scryfallIds = cards.map(c => c.scryfallId);
    if (scryfallIds.length === 0) return;
    const prices = await directGet<{scryfall_id: string; price_sell_usd: number}>('prices', `scryfall_id=in.(${scryfallIds.join(',')})&select=scryfall_id,price_sell_usd`);
    if (!prices.length) return;
    const priceMap = new Map(prices.map((p) => [p.scryfall_id, p.price_sell_usd]));
    for (const card of cards) {
      const newPrice = priceMap.get(card.scryfallId);
      if (newPrice !== undefined && newPrice !== card.price) {
        await directFetch('PATCH', 'cards', { custom_price: newPrice }, `id=eq.${card.id}`);
      }
    }
  },

  removeCard: async (cardId: string) => {
    // card_count decremented automatically by trigger tr_cards_count
    await directFetch('DELETE', 'cards', null, `id=eq.${cardId}`);
  },

  toggleShowcase: async (cardId: string, isShowcase: boolean) => {
    await directFetch('PATCH', 'cards', { is_showcase: isShowcase }, `id=eq.${cardId}`);
  },
};

// ─── SHOWCASE SERVICE ─────────────────────────────────────────────────────────

export const showcaseService = {
  getShowcaseItems: async (_game: GameType = GameType.MTG): Promise<ShowcaseItem[]> => {
    try {
      const data = await directGet<any>('cards', `is_showcase=eq.true&order=added_at.desc&limit=50&select=*,users!cards_user_id_fkey(id,display_name,trader_score,subscription_tier,whatsapp)`);
      const rows = await attachPrices(data);
      return rows.map((row: any) => ({
        ...mapToCard(row),
        sellerId: row.user_id,
        sellerName: row.users?.display_name || 'Unknown Trader',
        sellerWhatsapp: row.users?.whatsapp || undefined,
      }));
    } catch {
      return [];
    }
  },

  getNewestShowcase: async (): Promise<ShowcaseItem[]> => {
    const items = await showcaseService.getShowcaseItems();
    return items.slice(0, 10);
  },
};

// ─── AUCTION SERVICE ──────────────────────────────────────────────────────────

export const auctionService = {
  getAllAuctions: async (): Promise<Card[]> => {
    try {
      const data = await directGet<any>('cards', `binder_type=eq.AUCTION&auction_status=eq.ACTIVE&order=auction_end_date.asc&select=*,users!cards_user_id_fkey(display_name,trader_score,photo_url)`);
      const rows = await attachPrices(data);
      return rows.map(mapToCard);
    } catch {
      return [];
    }
  },

  getUserAuctions: async (userId: string): Promise<Card[]> => {
    try {
      const data = await directGet<any>('cards', `user_id=eq.${userId}&binder_type=eq.AUCTION&select=*,users!cards_user_id_fkey(display_name)`);
      const rows = await attachPrices(data);
      return rows.map(mapToCard);
    } catch {
      return [];
    }
  },

  placeBid: async (card: Card, userId: string): Promise<void> => {
    if (!card.id) return;
    if (card.userId === userId) throw new Error('You cannot bid on your own auction.');
    const newBid = (card.currentBid || card.basePrice || 0) + 1;
    const prevBidderId = card.topBidderId;

    const updates: Record<string, any> = { current_bid: newBid, top_bidder_id: userId };
    if (card.auctionEndDate) {
      const now = Date.now();
      const timeLeft = card.auctionEndDate - now;
      if (timeLeft < 5 * 60 * 1000 && timeLeft > 0) {
        updates.auction_end_date = new Date(now + 5 * 60 * 1000).toISOString();
      }
    }
    await directFetch('PATCH', 'cards', updates, `id=eq.${card.id}`);

    if (prevBidderId && prevBidderId !== userId) {
      notificationService.send(prevBidderId, 'OUTBID', 'You have been outbid!', `Someone bid ${card.currency === 'PEN' ? 'S/' : '$'} ${newBid} on ${card.name}. Bid again!`, '/auctions', card.imageUrl);
      oneSignalService.sendNotification('You have been outbid!', `Someone bid ${card.currency === 'PEN' ? 'S/' : '$'} ${newBid} on ${card.name}. Tap to reclaim your glory!`, [prevBidderId], `${window.location.origin}/?binder=${card.binderId}`).catch(err => console.error('Push Notification Failed', err));
    }
  },

  directBuy: async (card: Card, userId: string): Promise<void> => {
    if (!card.id) return;
    if (card.userId === userId) throw new Error('You cannot buy your own auction.');
    await directFetch('PATCH', 'cards', {
      auction_status: AuctionStatus.SOLD.toString(),
      winner_id: userId,
      current_bid: card.buyItNowPrice,
    }, `id=eq.${card.id}`);
    notificationService.send(card.userId, 'SYSTEM', 'Auction Sold!', `Your ${card.name} was bought instantly for ${card.buyItNowPrice}. Contact the winner!`, `/?trader=${userId}`, card.imageUrl);
    oneSignalService.sendNotification('Auction Sold!', `Your ${card.name} was bought instantly! Check your dashboard.`, [card.userId]).catch(err => console.error('Push Notification Failed', err));
    tradeService.logInteraction(card.userId, card.name, card.name, card.id, card.binderId);
  },

  closeAuction: async (card: Card): Promise<boolean> => {
    if (!card.id) return false;
    let closed: boolean;
    try {
      closed = await directInsert<boolean>('rpc/close_auction', { p_card_id: card.id });
    } catch (e) { console.error('[closeAuction]', e); return false; }
    if (closed && card.topBidderId) {
      oneSignalService.sendNotification(
        '¡Subasta finalizada!',
        `Tu ${card.name} fue vendida. ¡Contacta al ganador!`,
        [card.userId],
      ).catch(() => {});
      oneSignalService.sendNotification(
        '¡Ganaste la subasta!',
        `Ganaste ${card.name}. Contacta al vendedor.`,
        [card.topBidderId],
      ).catch(() => {});
    }
    return closed;
  },
};

// ─── MATCHING SERVICE ─────────────────────────────────────────────────────────

export const matchingService = {
  findMatches: async (currentUserId: string): Promise<MatchResult[]> => {
    const { data: wishlistCards, error: wErr } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', currentUserId)
      .eq('binder_type', 'WISHLIST');

    if (wErr) console.error('[findMatches] wishlist query error:', wErr);
    if (!wishlistCards?.length) return [];

    const uniqueNames = Array.from(new Set(wishlistCards.map((c: any) => c.name)));
    const namesToSearch = uniqueNames.slice(0, 10) as string[];

    console.log('[findMatches] searching for:', namesToSearch);

    const matches = await directGet<any>('cards', `name=in.(${namesToSearch.map(n => `"${n}"`).join(',')})&binder_type=in.(FOR_TRADE)&user_id=neq.${currentUserId}&select=*`);

    console.log('[findMatches] raw matches:', matches.length);

    if (!matches.length) return [];

    // Fetch seller profiles separately to avoid RLS issues with JOIN
    const sellerIds = [...new Set(matches.map((m: any) => m.user_id))] as string[];
    const sellers = await directGet<any>('users', `id=in.(${sellerIds.join(',')})&select=id,display_name,trader_score,searcher_score,whatsapp,subscription_tier,photo_url,preferred_store,preferred_game`);

    const sellerMap = Object.fromEntries(sellers.map((s: any) => [s.id, mapToUserProfile(s)]));

    const TIER_RANK: Record<string, number> = {
      [SubscriptionTier.MYTHIC]:   0,
      [SubscriptionTier.RARE]:     1,
      [SubscriptionTier.UNCOMMON]: 2,
      [SubscriptionTier.COMMON]:   3,
    };

    const results: MatchResult[] = [];
    for (const m of matches) {
      const exactWant = wishlistCards.find((w: any) => w.name === m.name && w.scryfall_id === m.scryfall_id);
      const looseWant = wishlistCards.find((w: any) => w.name === m.name);
      const wantRow = exactWant || looseWant;
      if (wantRow) {
        const seller: UserProfile = sellerMap[m.user_id]
          ?? { id: m.user_id, displayName: 'Remote User', email: '', isOnline: false, subscriptionTier: SubscriptionTier.COMMON, traderScore: 0, searcherScore: 0, preferredGame: '' };
        results.push({
          card: mapToCard(wantRow),
          matchCard: mapToCard(m),
          seller,
          matchType: exactWant ? 'EXACT' : 'LOOSE',
        });
      }
    }

    results.sort((a, b) => {
      const tierDiff = (TIER_RANK[a.seller.subscriptionTier] ?? 9) - (TIER_RANK[b.seller.subscriptionTier] ?? 9);
      if (tierDiff !== 0) return tierDiff;
      return b.seller.traderScore - a.seller.traderScore;
    });

    return results;
  },
};

// ─── NEWS SERVICE ─────────────────────────────────────────────────────────────

export const newsService = {
  getNews: async (): Promise<NewsItem[]> => {
    try {
      const data = await directGet<any>('news', 'select=*&order=published_at.desc&limit=20');
      return data.map(mapToNewsItem);
    } catch {
      return [];
    }
  },

  addNews: async (news: Omit<NewsItem, 'id'>) => {
    await directFetch('POST', 'news', {
      title: news.title,
      image_url: news.imageUrl,
      link_url: news.linkUrl,
      game: mapGameTypeToDb(news.game),
      published_at: new Date(news.date).toISOString(),
      source_name: news.sourceName,
    });
  },

  deleteNews: async (id: string) => {
    await directFetch('DELETE', 'news', null, `id=eq.${id}`);
  },
};

// ─── STORE DIRECTORY SERVICE ──────────────────────────────────────────────────

export const storeDirectoryService = {
  getStores: async (): Promise<StoreProfile[]> => {
    try {
      const data = await directGet<any>('stores', 'select=*');
      return data.map(mapToStoreProfile);
    } catch {
      return [];
    }
  },

  addStore: async (store: Omit<StoreProfile, 'id'>) => {
    const validGames = (store.games || [GameType.MTG])
      .map(mapGameTypeToDb)
      .filter(g => g === 'MTG');
    await directFetch('POST', 'stores', {
      name: store.name,
      logo_url: store.logoUrl,
      website_url: store.websiteUrl,
      maps_url: store.mapsUrl,
      location: store.location,
      games: validGames.length ? validGames : ['MTG'],
      events_image_url: store.eventsImageUrl ?? null,
    });
  },

  updateEventsImage: async (id: string, eventsImageUrl: string | null) => {
    await directFetch('PATCH', 'stores', { events_image_url: eventsImageUrl }, `id=eq.${id}`);
  },

  deleteStore: async (id: string) => {
    await directFetch('DELETE', 'stores', null, `id=eq.${id}`);
  },
};

// ─── USER STATS SERVICE ───────────────────────────────────────────────────────

export const userStatsService = {
  getUserStats: async (userId: string): Promise<{ folderCards: number; auctionCards: number; wishlistCards: number; pendingFeedbacks: number }> => {
    try {
      const [cards, feedbacks] = await Promise.all([
        directGet<{ binder_type: string }>('cards', `user_id=eq.${userId}&select=binder_type`),
        directGet<{ id: string }>('trade_interactions', `or=(buyer_id.eq.${userId},seller_id.eq.${userId})&status=eq.PENDING&select=id`),
      ]);
      return {
        folderCards: cards.filter(c => c.binder_type === 'FOR_TRADE').length,
        auctionCards: cards.filter(c => c.binder_type === 'AUCTION').length,
        wishlistCards: cards.filter(c => c.binder_type === 'WISHLIST').length,
        pendingFeedbacks: feedbacks.length,
      };
    } catch {
      return { folderCards: 0, auctionCards: 0, wishlistCards: 0, pendingFeedbacks: 0 };
    }
  },
};
