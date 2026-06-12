
export enum GameType {
  MTG = 'Magic: The Gathering',
  POKEMON = 'Pokémon',
  YUGIOH = 'Yu-Gi-Oh!'
}

export enum BinderType {
  FOR_TRADE = 'For Trade/Sell',
  WISHLIST = 'Wishlist',
  COLLECTION = 'Personal Collection',
  AUCTION = 'Auction'
}

export enum CardCondition {
  NM = 'Near Mint',
  LP = 'Lightly Played',
  MP = 'Moderately Played',
  HP = 'Heavily Played',
  DMG = 'Damaged'
}

export enum SubscriptionTier {
  COMMON = 'Common',
  UNCOMMON = 'Uncommon',
  RARE = 'Rare',
  MYTHIC = 'Mythic'
}

export enum AuctionStatus {
  ACTIVE = 'ACTIVE',
  SOLD = 'SOLD', // Via Direct Buy
  ENDED = 'ENDED' // Time ran out
}

export interface TierLimits {
  // Trade Settings
  maxTradeBinders: number;
  maxCardsPerTradeBinder: number;

  // Wishlist Settings
  maxWishlistBinders: number;
  maxCardsPerWishlistBinder: number;

  // Auction Settings
  maxAuctionBinders: number;
  maxAuctionCardsPerBinder: number;

  // General Settings
  maxShowcaseItems: number;
  maxCardAlerts: number;
  
  // Pricing
  pricePerMonth: number;
  currency: 'USD' | 'PEN';
  
  // Payment
  paymentLink?: string; // URL to Stripe/MercadoPago checkout
}

export interface GlobalConfig {
  [SubscriptionTier.COMMON]: TierLimits;
  [SubscriptionTier.UNCOMMON]: TierLimits;
  [SubscriptionTier.RARE]: TierLimits;
  [SubscriptionTier.MYTHIC]: TierLimits;
}

export interface SystemConfig {
    minTradeConfirmHours: number;
    maxTradeConfirmHours: number;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  whatsapp?: string;
  preferredStore?: string;
  preferredGame?: string; 
  storeAnnouncement?: string; 
  isOnline?: boolean;
  subscriptionTier: SubscriptionTier;
  trialEndsAt?: string;
  isAdmin?: boolean;

  // REPUTATION SYSTEM
  traderScore: number;
  searcherScore: number;
  successfulTrades?: number; // Legacy, map to traderScore
}

export interface Binder {
  id: string;
  userId: string;
  game: GameType;
  type: BinderType;
  name: string;
  coverImage?: string;
  cardCount: number;
  createdAt: number;
}

export interface Card {
  id: string;
  binderId: string;
  userId: string;
  scryfallId: string;
  name: string;
  setName: string;
  collectorNumber: string;
  imageUrl: string;
  condition: CardCondition;
  isFoil: boolean;
  rarity: string;
  price?: number; 
  customPrice?: number; // User defined price
  currency?: 'USD' | 'PEN'; // User defined currency
  purchaseUrl?: string; // Card Kingdom link
  addedAt: number;
  binderType?: BinderType;
  isShowcase?: boolean;
  game?: string;
  quantity: number; // New field
  
  // Auction Specifics
  auctionEndDate?: number; // Timestamp
  basePrice?: number;
  buyItNowPrice?: number;
  currentBid?: number;
  topBidderId?: string;
  auctionStatus?: AuctionStatus;
  winnerId?: string; // Final winner
}

export interface ShowcaseItem extends Card {
  sellerName: string;
  sellerId: string;
}

export interface MatchResult {
  card: Card;
  matchCard: Card;
  seller: UserProfile;
  matchType?: 'EXACT' | 'LOOSE';
}

export enum FeedbackValue {
    MALO = -2,
    BUENO = 1,
    EXCELENTE = 3,
    NO_CONCRETADO = 0 // Specialized case
}

export interface TradeInteraction {
    id: string;
    buyerId: string;
    sellerId: string;
    sellerName: string;
    buyerName: string; // Added for dual feedback
    cardName?: string;
    timestamp: number;
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'IGNORED';

    // DUAL FEEDBACK TRACKING
    buyerFeedback?: FeedbackValue;
    sellerFeedback?: FeedbackValue;
    buyerConfirmedAt?: number;
    sellerConfirmedAt?: number;

    // INVENTORY DISCOUNT PROMPT
    cardId?: string;
    binderId?: string;
    inventoryUpdated?: boolean;
}

export interface InventoryDecision {
    interactionId: string;
    cardId: string;
    cardName: string;
    setName: string;
    binderName: string;
    buyerName: string;
    cardExists: boolean;
}

export type InventoryDecisionResult =
    | { status: 'decremented'; remaining: number }
    | { status: 'deleted' }
    | { status: 'not_found' };

export interface ScryfallCard {
  id: string;
  oracle_id: string;
  name: string;
  set_name: string;
  set: string;
  collector_number: string;
  image_uris?: {
    normal: string;
    small: string;
  };
  card_faces?: Array<{
    image_uris?: {
      normal: string;
    };
  }>;
  rarity: string;
  prices: {
    usd: string | null;
    usd_foil: string | null;
  };
  purchase_uris?: {
    tcgplayer?: string;
    cardmarket?: string;
    cardhoarder?: string;
    card_kingdom?: string;
  };
  last_updated?: number; // Field for global cache library logic
}

// NEW INTERFACES FOR HOME PAGE
export interface NewsItem {
    id: string;
    title: string;
    imageUrl: string;
    linkUrl: string;
    game: GameType;
    date: number;
    sourceName: string;
}

export interface StoreProfile {
    id: string;
    name: string;
    logoUrl: string; // URL to logo image
    websiteUrl: string;
    mapsUrl: string;
    location: string;
    games: GameType[];
    linkedUserId?: string; // OPTIONAL: ID of the UserProfile within the app to link directly
}

export interface AppNotification {
    id: string;
    userId: string;
    type: 'OUTBID' | 'WISH_ALERT' | 'SYSTEM';
    title: string;
    message: string;
    linkUrl?: string;
    imageUrl?: string;
    read: boolean;
    createdAt: number;
}

export interface CardAlert {
    userId: string;
    cardName: string;
    createdAt: number;
}
