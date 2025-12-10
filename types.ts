
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
  maxTradeBinders: number;
  maxShowcaseItems: number;
  maxAuctionBinders: number;
  maxAuctionCardsPerBinder: number;
  maxCardAlerts: number;
  pricePerMonth: number;
  currency: 'USD' | 'PEN';
}

export interface GlobalConfig {
  [SubscriptionTier.COMMON]: TierLimits;
  [SubscriptionTier.UNCOMMON]: TierLimits;
  [SubscriptionTier.RARE]: TierLimits;
  [SubscriptionTier.MYTHIC]: TierLimits;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  whatsapp?: string;
  preferredStore?: string;
  isOnline?: boolean;
  subscriptionTier: SubscriptionTier;
  isAdmin?: boolean;
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
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  read: boolean;
}

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
}