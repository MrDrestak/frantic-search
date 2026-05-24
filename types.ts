// Enums
export type GameType = 'MTG';
export type BinderType = 'FOR_TRADE' | 'WISHLIST' | 'AUCTION';
export type CardCondition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG';
export type SubscriptionTier = 'COMMON' | 'UNCOMMON' | 'RARE' | 'MYTHIC';
export type AuctionStatus = 'ACTIVE' | 'SOLD' | 'ENDED';
export type CurrencyType = 'USD' | 'PEN';
export type FeedbackValue = 'MALO' | 'BUENO' | 'EXCELENTE' | 'NO_CONCRETADO';
export type TradeStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'IGNORED';
export type NotificationType = 'OUTBID' | 'WISH_ALERT' | 'SYSTEM';
export type ReportReason = 'SCAM' | 'NOT_SHIPPED' | 'DAMAGED_UNDECLARED' | 'ABUSIVE' | 'OTHER';
export type ReportStatus = 'OPEN' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';

// Tables
export interface User {
  id: string;
  email: string;
  display_name: string;
  photo_url: string | null;
  whatsapp: string | null;
  preferred_store: string | null;
  preferred_game: GameType;
  store_announcement: string | null;
  subscription_tier: SubscriptionTier;
  trial_ends_at: string | null;
  trader_score: number;
  searcher_score: number;
  is_admin: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface Binder {
  id: string;
  user_id: string;
  game: GameType;
  type: BinderType;
  name: string;
  cover_image: string | null;
  card_count: number;
  price_multiplier: number | null;
  created_at: string;
}

export interface Card {
  id: string;
  binder_id: string;
  user_id: string;
  scryfall_id: string;
  name: string;
  set_name: string | null;
  collector_number: string | null;
  image_url: string | null;
  rarity: string | null;
  game: GameType;
  condition: CardCondition;
  is_foil: boolean;
  quantity: number;
  custom_price: number | null;
  currency: CurrencyType | null;
  binder_type: BinderType | null;
  is_showcase: boolean;
  purchase_url: string | null;
  added_at: string;
  // Auction fields
  auction_end_date: string | null;
  base_price: number | null;
  buy_it_now_price: number | null;
  auction_currency: CurrencyType | null;
  current_bid: number | null;
  top_bidder_id: string | null;
  bid_count: number;
  auction_status: AuctionStatus | null;
  winner_id: string | null;
}

export interface Bid {
  id: string;
  card_id: string;
  user_id: string;
  amount: number;
  created_at: string;
}

export interface TradeInteraction {
  id: string;
  buyer_id: string;
  seller_id: string;
  buyer_name: string;
  seller_name: string;
  card_name: string;
  status: TradeStatus;
  buyer_feedback: FeedbackValue | null;
  seller_feedback: FeedbackValue | null;
  buyer_confirmed_at: string | null;
  seller_confirmed_at: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: ReportReason;
  description: string | null;
  related_card_id: string | null;
  related_interaction_id: string | null;
  status: ReportStatus;
  admin_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link_url: string | null;
  image_url: string | null;
  read: boolean;
  created_at: string;
}

export interface CardAlert {
  id: string;
  user_id: string;
  card_name: string;
  created_at: string;
}

export interface Store {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  maps_url: string | null;
  location: string | null;
  games: GameType[];
  default_multiplier: number | null;
  linked_user_id: string | null;
  created_at: string;
}

export interface NewsItem {
  id: string;
  title: string;
  image_url: string | null;
  link_url: string | null;
  game: GameType;
  source_name: string | null;
  published_at: string;
}

// Config shapes (stored as JSONB in settings table)
export interface TierConfig {
  maxTradeBinders: number;
  maxCardsPerTradeBinder: number;
  maxWishlistBinders: number;
  maxCardsPerWishlistBinder: number;
  maxAuctionBinders: number;
  maxAuctionCardsPerBinder: number;
  maxShowcaseItems: number;
  maxCardAlerts: number;
  pricePerMonth: number;
  currency: string;
}

export interface GlobalConfig {
  COMMON: TierConfig;
  UNCOMMON: TierConfig;
  RARE: TierConfig;
  MYTHIC: TierConfig;
}

export interface SystemConfig {
  minTradeConfirmHours: number;
  maxTradeConfirmHours: number;
  defaultMultiplier: number;
}

// View types (v_tradeable_cards, v_active_auctions, v_showcase_items)
export interface TradeableCard extends Card {
  ck_price_usd: number | null;
  ck_name: string | null;
  ck_edition: string | null;
  multiplier: number;
  display_price_pen: number | null;
  seller_name: string;
  trader_score: number;
  searcher_score: number;
  whatsapp: string | null;
  subscription_tier: SubscriptionTier;
  seller_photo: string | null;
  seller_last_active: string | null;
}

export interface AuctionCard extends Card {
  ck_price_usd: number | null;
  seller_name: string;
  trader_score: number;
  seller_photo: string | null;
  binder_multiplier: number | null;
}

export interface ShowcaseItem {
  id: string;
  name: string;
  set_name: string | null;
  scryfall_id: string;
  condition: CardCondition;
  is_foil: boolean;
  image_url: string | null;
  rarity: string | null;
  user_id: string;
  binder_id: string;
  custom_price: number | null;
  added_at: string;
  ck_price_usd: number | null;
  display_price_pen: number | null;
  seller_name: string;
  trader_score: number;
  subscription_tier: SubscriptionTier;
}

// Card with joined prices (returned by cardService.getBinderCards)
export interface CardWithPrice extends Card {
  prices: {
    price_sell_usd: number | null;
    ck_name: string | null;
    ck_edition: string | null;
  } | null;
}
