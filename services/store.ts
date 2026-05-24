import { supabase, getSupabaseAdmin } from './supabase';
import type {
  User, Binder, Card, CardWithPrice, Bid,
  TradeInteraction, Report, AppNotification, CardAlert,
  Store, NewsItem, GlobalConfig, SystemConfig,
  TradeableCard, AuctionCard, ShowcaseItem,
  BinderType, GameType, SubscriptionTier, FeedbackValue, TradeStatus,
} from '../types';

// ─────────────────────────────────────────────────────────────
// AUTH SERVICE
// ─────────────────────────────────────────────────────────────

export const authService = {
  async signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) throw error;
  },

  // Returns an unsubscribe function, matching the Firebase onAuthStateChanged pattern.
  onAuthStateChange(callback: (user: User | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session?.user) {
          callback(null);
          return;
        }
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        callback(profile ?? null);
      }
    );
    return () => subscription.unsubscribe();
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getProfile(uid: string): Promise<User | null> {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .single();
    return data ?? null;
  },

  async updateProfile(uid: string, updates: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>) {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', uid);
    if (error) throw error;
  },

  async updateLastLogin(uid: string) {
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', uid);
  },
};

// Guest session is localStorage-only — no DB writes.
export const guestService = {
  KEY: 'frantic_guest',

  set(displayName: string) {
    localStorage.setItem(this.KEY, JSON.stringify({ display_name: displayName }));
  },

  get(): { display_name: string } | null {
    const raw = localStorage.getItem(this.KEY);
    return raw ? JSON.parse(raw) : null;
  },

  clear() {
    localStorage.removeItem(this.KEY);
  },
};

// ─────────────────────────────────────────────────────────────
// CONFIG SERVICE
// ─────────────────────────────────────────────────────────────

export const configService = {
  async getGlobalConfig(): Promise<GlobalConfig> {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'global_config')
      .single();
    if (error) throw error;
    return data.value as GlobalConfig;
  },

  async updateGlobalConfig(config: GlobalConfig) {
    const { error } = await supabase
      .from('settings')
      .update({ value: config })
      .eq('key', 'global_config');
    if (error) throw error;
  },

  async getSystemConfig(): Promise<SystemConfig> {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'system_config')
      .single();
    if (error) throw error;
    return data.value as SystemConfig;
  },

  async updateSystemConfig(config: SystemConfig) {
    const { error } = await supabase
      .from('settings')
      .update({ value: config })
      .eq('key', 'system_config');
    if (error) throw error;
  },
};

// ─────────────────────────────────────────────────────────────
// BINDER SERVICE
// ─────────────────────────────────────────────────────────────

export const binderService = {
  async getUserBinders(userId: string): Promise<Binder[]> {
    const { data, error } = await supabase
      .from('binders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getBinder(binderId: string): Promise<Binder | null> {
    const { data } = await supabase
      .from('binders')
      .select('*')
      .eq('id', binderId)
      .single();
    return data ?? null;
  },

  async createBinder(
    binder: Omit<Binder, 'id' | 'card_count' | 'created_at'>
  ): Promise<Binder> {
    const { data, error } = await supabase
      .from('binders')
      .insert(binder)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateBinder(binderId: string, updates: Partial<Omit<Binder, 'id' | 'created_at'>>) {
    const { error } = await supabase
      .from('binders')
      .update(updates)
      .eq('id', binderId);
    if (error) throw error;
  },

  async deleteBinder(binderId: string) {
    // Cards are removed automatically via ON DELETE CASCADE on cards.binder_id.
    const { error } = await supabase
      .from('binders')
      .delete()
      .eq('id', binderId);
    if (error) throw error;
  },
};

// ─────────────────────────────────────────────────────────────
// CARD SERVICE
// ─────────────────────────────────────────────────────────────

export const cardService = {
  async getBinderCards(binderId: string): Promise<CardWithPrice[]> {
    const { data, error } = await supabase
      .from('cards')
      .select(`
        *,
        prices!cards_scryfall_id_fkey (
          price_sell_usd,
          ck_name,
          ck_edition
        )
      `)
      .eq('binder_id', binderId)
      .order('added_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as CardWithPrice[];
  },

  async addCard(
    card: Omit<Card, 'id' | 'added_at' | 'bid_count'>
  ): Promise<Card> {
    const { data, error } = await supabase
      .from('cards')
      .insert(card)
      .select()
      .single();
    if (error) throw error;
    // binder.card_count is incremented by the tr_cards_count DB trigger.
    return data;
  },

  async updateCard(cardId: string, updates: Partial<Card>) {
    const { error } = await supabase
      .from('cards')
      .update(updates)
      .eq('id', cardId);
    if (error) throw error;
  },

  async removeCard(cardId: string) {
    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', cardId);
    if (error) throw error;
    // binder.card_count is decremented by the tr_cards_count DB trigger.
  },

  async getTradeableCards(filters?: { binderType?: BinderType }): Promise<TradeableCard[]> {
    let query = supabase.from('v_tradeable_cards').select('*');
    if (filters?.binderType) query = query.eq('binder_type', filters.binderType);
    const { data, error } = await query.order('added_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as TradeableCard[];
  },
};

// ─────────────────────────────────────────────────────────────
// AUCTION SERVICE
// ─────────────────────────────────────────────────────────────

export const auctionService = {
  async getActiveAuctions(): Promise<AuctionCard[]> {
    const { data, error } = await supabase
      .from('v_active_auctions')
      .select('*')
      .order('auction_end_date', { ascending: true });
    if (error) throw error;
    return (data ?? []) as AuctionCard[];
  },

  async getAuctionCard(cardId: string): Promise<AuctionCard | null> {
    const { data } = await supabase
      .from('v_active_auctions')
      .select('*')
      .eq('id', cardId)
      .single();
    return data ? (data as AuctionCard) : null;
  },

  async placeBid(cardId: string, userId: string, amount: number) {
    // Atomic: validates bid, prevents self-bidding, handles overtime extension.
    const { error } = await supabase.rpc('place_bid', {
      p_card_id: cardId,
      p_user_id: userId,
      p_amount: amount,
    });
    if (error) throw new Error(error.message); // 'BID_TOO_LOW' | 'AUCTION_ENDED' | 'SELF_BID_FORBIDDEN'
  },

  async getBidHistory(cardId: string): Promise<Bid[]> {
    const { data, error } = await supabase
      .from('bids')
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async closeAuction(cardId: string, status: 'SOLD' | 'ENDED', winnerId?: string) {
    const updates: Partial<Card> = { auction_status: status };
    if (winnerId) updates.winner_id = winnerId;
    const { error } = await supabase.from('cards').update(updates).eq('id', cardId);
    if (error) throw error;
  },

  subscribeToAuction(cardId: string, onUpdate: (card: Partial<Card>) => void) {
    return supabase
      .channel(`auction-${cardId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cards', filter: `id=eq.${cardId}` },
        (payload) => onUpdate(payload.new as Partial<Card>)
      )
      .subscribe();
  },

  subscribeToBids(cardId: string, onNew: (bid: Bid) => void) {
    return supabase
      .channel(`bids-${cardId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids', filter: `card_id=eq.${cardId}` },
        (payload) => onNew(payload.new as Bid)
      )
      .subscribe();
  },
};

// ─────────────────────────────────────────────────────────────
// MATCHING SERVICE
// ─────────────────────────────────────────────────────────────

export const matchingService = {
  // Single SQL query replacing the previous N+1 Firestore reads.
  async findMatches(
    wishlistCardNames: string[],
    currentUserId: string
  ): Promise<TradeableCard[]> {
    if (!wishlistCardNames.length) return [];
    const { data, error } = await supabase
      .from('cards')
      .select(`
        *,
        prices (price_sell_usd),
        users!cards_user_id_fkey (display_name, trader_score, whatsapp, subscription_tier)
      `)
      .in('name', wishlistCardNames)
      .eq('binder_type', 'FOR_TRADE')
      .neq('user_id', currentUserId);
    if (error) throw error;
    return (data ?? []) as unknown as TradeableCard[];
  },
};

// ─────────────────────────────────────────────────────────────
// TRADE SERVICE
// ─────────────────────────────────────────────────────────────

export const tradeService = {
  async logInteraction(
    interaction: Pick<TradeInteraction, 'buyer_id' | 'seller_id' | 'buyer_name' | 'seller_name' | 'card_name'>
  ): Promise<TradeInteraction> {
    const { data, error } = await supabase
      .from('trade_interactions')
      .insert(interaction)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getUserInteractions(userId: string): Promise<TradeInteraction[]> {
    const { data, error } = await supabase
      .from('trade_interactions')
      .select('*')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async updateInteractionStatus(id: string, status: TradeStatus) {
    const { error } = await supabase
      .from('trade_interactions')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
  },

  async submitFeedback(interactionId: string, userId: string, feedback: FeedbackValue) {
    // Atomic: locks the row, records feedback, updates reputation scores when both sides respond.
    const { error } = await supabase.rpc('submit_feedback', {
      p_interaction_id: interactionId,
      p_user_id: userId,
      p_feedback: feedback,
    });
    if (error) throw new Error(error.message);
  },
};

// ─────────────────────────────────────────────────────────────
// NOTIFICATION SERVICE
// ─────────────────────────────────────────────────────────────

export const notificationService = {
  async getUserNotifications(userId: string): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async createNotification(
    notification: Omit<AppNotification, 'id' | 'read' | 'created_at'>
  ) {
    const { error } = await supabase.from('notifications').insert(notification);
    if (error) throw error;
  },

  async markAsRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    if (error) throw error;
  },

  async markAllAsRead(userId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) throw error;
  },

  async deleteNotification(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
    if (error) throw error;
  },

  subscribeToNotifications(userId: string, onNew: (n: AppNotification) => void) {
    return supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => onNew(payload.new as AppNotification)
      )
      .subscribe();
  },
};

// ─────────────────────────────────────────────────────────────
// ALERT SERVICE
// ─────────────────────────────────────────────────────────────

export const alertService = {
  async getUserAlerts(userId: string): Promise<CardAlert[]> {
    const { data, error } = await supabase
      .from('card_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async addAlert(userId: string, cardName: string): Promise<CardAlert> {
    const { data, error } = await supabase
      .from('card_alerts')
      .insert({ user_id: userId, card_name: cardName })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeAlert(userId: string, cardName: string) {
    const { error } = await supabase
      .from('card_alerts')
      .delete()
      .eq('user_id', userId)
      .eq('card_name', cardName);
    if (error) throw error;
  },
};

// ─────────────────────────────────────────────────────────────
// NEWS SERVICE
// ─────────────────────────────────────────────────────────────

export const newsService = {
  async getNews(game?: GameType): Promise<NewsItem[]> {
    let query = supabase.from('news').select('*').order('published_at', { ascending: false });
    if (game) query = query.eq('game', game);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async createNewsItem(item: Omit<NewsItem, 'id' | 'published_at'>) {
    const { error } = await supabase.from('news').insert(item);
    if (error) throw error;
  },

  async deleteNewsItem(id: string) {
    const { error } = await supabase.from('news').delete().eq('id', id);
    if (error) throw error;
  },
};

// ─────────────────────────────────────────────────────────────
// STORE DIRECTORY SERVICE
// ─────────────────────────────────────────────────────────────

export const storeDirectoryService = {
  async getStores(): Promise<Store[]> {
    const { data, error } = await supabase.from('stores').select('*').order('name');
    if (error) throw error;
    return data ?? [];
  },

  async createStore(store: Omit<Store, 'id' | 'created_at'>): Promise<Store> {
    const { data, error } = await supabase.from('stores').insert(store).select().single();
    if (error) throw error;
    return data;
  },

  async updateStore(id: string, updates: Partial<Omit<Store, 'id' | 'created_at'>>) {
    const { error } = await supabase.from('stores').update(updates).eq('id', id);
    if (error) throw error;
  },

  async deleteStore(id: string) {
    const { error } = await supabase.from('stores').delete().eq('id', id);
    if (error) throw error;
  },
};

// ─────────────────────────────────────────────────────────────
// SHOWCASE SERVICE
// ─────────────────────────────────────────────────────────────

export const showcaseService = {
  async getShowcaseItems(): Promise<ShowcaseItem[]> {
    const { data, error } = await supabase.from('v_showcase_items').select('*');
    if (error) throw error;
    return (data ?? []) as ShowcaseItem[];
  },
};

// ─────────────────────────────────────────────────────────────
// REPORT SERVICE
// ─────────────────────────────────────────────────────────────

export const reportService = {
  async createReport(
    report: Pick<Report, 'reporter_id' | 'reported_user_id' | 'reason' | 'description' | 'related_card_id' | 'related_interaction_id'>
  ) {
    const { error } = await supabase.from('reports').insert(report);
    if (error) throw error;
  },

  async getUserReports(reporterId: string): Promise<Report[]> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('reporter_id', reporterId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

// ─────────────────────────────────────────────────────────────
// ADMIN SERVICE  (server-side only — call from API routes or Server Actions)
// ─────────────────────────────────────────────────────────────

export const adminService = {
  async assignTierByEmail(email: string, tier: SubscriptionTier) {
    const { error } = await supabase
      .from('users')
      .update({ subscription_tier: tier })
      .eq('email', email);
    if (error) throw error;
  },

  async getAllReports(): Promise<Report[]> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async updateReport(id: string, updates: Partial<Report>) {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from('reports').update(updates).eq('id', id);
    if (error) throw error;
  },

  async wipeDatabase() {
    const admin = getSupabaseAdmin();
    // Order matters: delete children before parents to avoid FK violations.
    const tables = [
      'bids', 'reports', 'notifications', 'card_alerts',
      'cards', 'binders', 'trade_interactions', 'news', 'stores', 'prices',
    ];
    for (const table of tables) {
      await admin.from(table as 'bids').delete().neq('id', '');
    }
  },
};
