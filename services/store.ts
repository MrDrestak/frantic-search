
import firebase from 'firebase/compat/app';
import { auth as firebaseAuth, googleProvider, db } from './firebase';
import { Binder, BinderType, Card, CardCondition, ChatMessage, GameType, MatchResult, UserProfile, ShowcaseItem, SubscriptionTier, GlobalConfig, AuctionStatus, TierLimits, SystemConfig, TradeInteraction, NewsItem, StoreProfile } from '../types';

// CONVERSION UTILS
const mapDoc = (doc: any): any => ({ id: doc.id, ...doc.data() });

// CONSTANTS
// Deprecated: BINDER_CARD_LIMIT is now dynamic per tier/binder type.
export const BINDER_CARD_LIMIT = 25; 

// DEFAULTS
const DEFAULT_CONFIG: GlobalConfig = {
    [SubscriptionTier.COMMON]: { 
        maxTradeBinders: 1, 
        maxCardsPerTradeBinder: 20,
        maxWishlistBinders: 1,
        maxCardsPerWishlistBinder: 20,
        maxAuctionBinders: 1, 
        maxAuctionCardsPerBinder: 1, 
        maxShowcaseItems: 3, 
        maxCardAlerts: 1,
        pricePerMonth: 0,
        currency: 'USD'
    },
    [SubscriptionTier.UNCOMMON]: { 
        maxTradeBinders: 3, 
        maxCardsPerTradeBinder: 50,
        maxWishlistBinders: 3,
        maxCardsPerWishlistBinder: 50,
        maxAuctionBinders: 2, 
        maxAuctionCardsPerBinder: 10, 
        maxShowcaseItems: 10, 
        maxCardAlerts: 5,
        pricePerMonth: 5,
        currency: 'USD'
    },
    [SubscriptionTier.RARE]: { 
        maxTradeBinders: 10, 
        maxCardsPerTradeBinder: 100,
        maxWishlistBinders: 10,
        maxCardsPerWishlistBinder: 100,
        maxAuctionBinders: 3, 
        maxAuctionCardsPerBinder: 15, 
        maxShowcaseItems: 50, 
        maxCardAlerts: 20,
        pricePerMonth: 15,
        currency: 'USD'
    },
    [SubscriptionTier.MYTHIC]: { 
        maxTradeBinders: 100, 
        maxCardsPerTradeBinder: 500,
        maxWishlistBinders: 0, // Stores don't need wishlists
        maxCardsPerWishlistBinder: 0,
        maxAuctionBinders: 10, 
        maxAuctionCardsPerBinder: 50, 
        maxShowcaseItems: 500, 
        maxCardAlerts: 100,
        pricePerMonth: 0, // Reserved for stores (custom)
        currency: 'USD'
    },
};

const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
    minTradeConfirmHours: 24,
    maxTradeConfirmHours: 72
};

// AUTH SERVICE
let currentUserProfile: UserProfile | null = null;
let currentConfig: GlobalConfig = DEFAULT_CONFIG;
let currentSystemConfig: SystemConfig = DEFAULT_SYSTEM_CONFIG;

export const auth = {
  login: async (): Promise<UserProfile> => {
    try {
      await firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      const result = await firebaseAuth.signInWithPopup(googleProvider);
      const user = result.user;
      
      if (!user) throw new Error("Authentication failed");

      const userRef = db.collection("users").doc(user.uid);
      const userDoc = await userRef.get();
      
      let customData: any = {};
      if (userDoc.exists) {
          customData = userDoc.data() || {};
      }

      // Hardcode admin check for specific email
      const isAdmin = customData.isAdmin || user.email === 'walterpacora88@gmail.com';

      const profile: UserProfile = {
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Unnamed Trader',
        photoURL: user.photoURL || undefined,
        isOnline: true,
        subscriptionTier: customData.subscriptionTier || SubscriptionTier.COMMON, // Default to Common
        isAdmin: isAdmin,
        successfulTrades: customData.successfulTrades || 0,
        preferredGame: customData.preferredGame || '', // Default to empty (All)
        ...customData
      };

      await userRef.set({
          displayName: profile.displayName,
          email: profile.email,
          photoURL: profile.photoURL,
          lastLogin: Date.now(),
          // Don't overwrite tier if it exists (allows admin to set Mythic)
          subscriptionTier: customData.subscriptionTier || profile.subscriptionTier,
          isAdmin: profile.isAdmin,
          successfulTrades: profile.successfulTrades,
          preferredGame: profile.preferredGame || null
      }, { merge: true });

      currentUserProfile = profile;
      localStorage.removeItem('lotus_is_guest');
      
      // Load config on login
      await configService.loadConfig();

      return profile;
    } catch (error: any) {
      console.error("Login failed", error);
      throw error;
    }
  },
  loginAsGuest: async (): Promise<UserProfile> => {
      const guestId = localStorage.getItem('lotus_guest_id') || 'guest_' + Math.floor(Math.random() * 10000);
      localStorage.setItem('lotus_guest_id', guestId);
      localStorage.setItem('lotus_is_guest', 'true');
      
      const guestProfile: UserProfile = {
          id: guestId,
          email: 'guest@lotus.test',
          displayName: 'Guest Trader',
          photoURL: undefined,
          isOnline: true,
          subscriptionTier: SubscriptionTier.COMMON,
          isAdmin: false,
          successfulTrades: 0,
          preferredGame: ''
      };
      
      currentUserProfile = guestProfile;
      await configService.loadConfig();
      return guestProfile;
  },
  getCurrentUser: () => {
    return currentUserProfile;
  },
  getUserPublicProfile: async (userId: string): Promise<UserProfile | null> => {
      try {
          const doc = await db.collection("users").doc(userId).get();
          if (doc.exists) {
              const data = doc.data() as any;
              // Ensure tier exists
              return { 
                  id: doc.id, 
                  ...data,
                  subscriptionTier: data.subscriptionTier || SubscriptionTier.COMMON,
                  successfulTrades: data.successfulTrades || 0
              } as UserProfile;
          }
          return null;
      } catch (e: any) {
          console.error("Error fetching public profile", e);
          return null;
      }
  },
  updateProfile: async (updates: Partial<UserProfile>): Promise<void> => {
      const user = firebaseAuth.currentUser;
      const current = currentUserProfile;
      
      if (!current) throw new Error("No user logged in");

      try {
          if (localStorage.getItem('lotus_is_guest') === 'true') {
             currentUserProfile = { ...current, ...updates };
             return;
          }

          if (!user) throw new Error("No Firebase user found");

          if (updates.displayName || updates.photoURL) {
              await user.updateProfile({
                  displayName: updates.displayName || user.displayName,
                  photoURL: updates.photoURL || user.photoURL
              });
          }

          const firestoreUpdates = {
              displayName: updates.displayName || current.displayName,
              email: current.email,
              whatsapp: updates.whatsapp || null,
              preferredStore: updates.preferredStore || null,
              preferredGame: updates.preferredGame || null, // Persist game preference
              storeAnnouncement: updates.storeAnnouncement || null, // New Announcement field
              updatedAt: Date.now()
          };
          
          await db.collection("users").doc(user.uid).set(firestoreUpdates, { merge: true });
          currentUserProfile = { ...current, ...updates };

      } catch (error: any) {
          console.error("Error updating profile:", error);
          throw error;
      }
  },
  logout: async () => {
      localStorage.removeItem('lotus_is_guest');
      await firebaseAuth.signOut();
      currentUserProfile = null;
  },
  subscribe: (callback: (user: UserProfile | null) => void) => {
    return firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = db.collection("users").doc(firebaseUser.uid);
        let customData: any = {};
        try {
            const userDoc = await userRef.get();
            if (userDoc.exists) customData = userDoc.data() || {};
        } catch(e) { console.warn("Offline or error fetching profile", e); }

        // Hardcode admin check for specific email
        const isAdmin = customData.isAdmin || firebaseUser.email === 'walterpacora88@gmail.com';

        const profile: UserProfile = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'Unnamed Trader',
            photoURL: firebaseUser.photoURL || undefined,
            isOnline: true,
            subscriptionTier: customData.subscriptionTier || SubscriptionTier.COMMON,
            isAdmin: isAdmin,
            successfulTrades: customData.successfulTrades || 0,
            preferredGame: customData.preferredGame || '',
            ...customData
        };
        currentUserProfile = profile;
        await configService.loadConfig(); // Ensure config is loaded
        callback(profile);
      } else {
        const isGuest = localStorage.getItem('lotus_is_guest');
        if (isGuest === 'true') {
             const guestId = localStorage.getItem('lotus_guest_id') || 'guest';
             const guestProfile: UserProfile = {
                id: guestId,
                email: 'guest@lotus.test',
                displayName: 'Guest Trader',
                photoURL: undefined,
                isOnline: true,
                subscriptionTier: SubscriptionTier.COMMON,
                isAdmin: false,
                successfulTrades: 0,
                preferredGame: ''
             };
             currentUserProfile = guestProfile;
             await configService.loadConfig();
             callback(guestProfile);
        } else {
             currentUserProfile = null;
             callback(null);
        }
      }
    });
  }
};

// CONFIG SERVICE
export const configService = {
    loadConfig: async () => {
        try {
            // Load Tier Config
            const doc = await db.collection("settings").doc("global").get();
            if (doc.exists) {
                const data = doc.data() as GlobalConfig;
                const mergeTier = (tier: SubscriptionTier) => ({
                    ...DEFAULT_CONFIG[tier],
                    ...(data[tier] || {})
                });
                currentConfig = {
                    [SubscriptionTier.COMMON]: mergeTier(SubscriptionTier.COMMON),
                    [SubscriptionTier.UNCOMMON]: mergeTier(SubscriptionTier.UNCOMMON),
                    [SubscriptionTier.RARE]: mergeTier(SubscriptionTier.RARE),
                    [SubscriptionTier.MYTHIC]: mergeTier(SubscriptionTier.MYTHIC),
                };
            } else {
                await db.collection("settings").doc("global").set(DEFAULT_CONFIG);
                currentConfig = DEFAULT_CONFIG;
            }

            // Load System Config
            const sysDoc = await db.collection("settings").doc("system").get();
            if (sysDoc.exists) {
                currentSystemConfig = { ...DEFAULT_SYSTEM_CONFIG, ...(sysDoc.data() as SystemConfig) };
            } else {
                await db.collection("settings").doc("system").set(DEFAULT_SYSTEM_CONFIG);
                currentSystemConfig = DEFAULT_SYSTEM_CONFIG;
            }

        } catch (e) {
            console.warn("Using default config (offline)", e);
            currentConfig = DEFAULT_CONFIG;
            currentSystemConfig = DEFAULT_SYSTEM_CONFIG;
        }
        return currentConfig;
    },
    getConfig: () => currentConfig,
    getSystemConfig: () => currentSystemConfig,
    updateConfig: async (newConfig: GlobalConfig) => {
        await db.collection("settings").doc("global").set(newConfig);
        currentConfig = newConfig;
    },
    updateSystemConfig: async (newSysConfig: SystemConfig) => {
        await db.collection("settings").doc("system").set(newSysConfig);
        currentSystemConfig = newSysConfig;
    }
};

// TRADE & REPUTATION SERVICE
export const tradeService = {
    logInteraction: async (sellerId: string, sellerName: string, cardName: string = 'General Inquiry') => {
        if (!currentUserProfile) return;
        if (currentUserProfile.id === sellerId) return; // Self contact doesn't count

        try {
            // Check for duplicate recent interactions (throttle)
            // UPDATED: Simplified query to avoid index errors. Removed orderBy.
            const recentSnap = await db.collection('trade_interactions')
                .where('buyerId', '==', currentUserProfile.id)
                .where('sellerId', '==', sellerId)
                .where('status', '==', 'PENDING')
                .get();

            // If an interaction exists from less than 24h ago, don't spam
            if (!recentSnap.empty) {
                // Find latest in memory
                const interactions = recentSnap.docs.map(d => d.data());
                interactions.sort((a, b) => b.timestamp - a.timestamp);
                const last = interactions[0];
                
                if (Date.now() - last.timestamp < 24 * 60 * 60 * 1000) {
                    return; 
                }
            }

            const interaction: TradeInteraction = {
                id: '', // filled by firestore
                buyerId: currentUserProfile.id,
                sellerId,
                sellerName,
                cardName,
                timestamp: Date.now(),
                status: 'PENDING'
            };

            await db.collection('trade_interactions').add(interaction);
        } catch (e) {
            console.error("Failed to log trade interaction", e);
        }
    },

    getPendingFeedback: async (): Promise<TradeInteraction[]> => {
        if (!currentUserProfile) return [];
        
        try {
            const snap = await db.collection('trade_interactions')
                .where('buyerId', '==', currentUserProfile.id)
                .where('status', '==', 'PENDING')
                .get();

            const now = Date.now();
            const minTime = currentSystemConfig.minTradeConfirmHours * 60 * 60 * 1000;
            const maxTime = currentSystemConfig.maxTradeConfirmHours * 60 * 60 * 1000;

            const pending = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TradeInteraction));
            
            // Filter locally for time window
            return pending.filter(i => {
                const diff = now - i.timestamp;
                return diff >= minTime && diff <= maxTime;
            });
        } catch (e) {
            console.error("Failed to get pending feedback", e);
            return [];
        }
    },

    confirmTrade: async (interactionId: string, isSuccessful: boolean) => {
        if (!currentUserProfile) return;

        const interactionRef = db.collection('trade_interactions').doc(interactionId);
        
        await db.runTransaction(async (t) => {
            const doc = await t.get(interactionRef);
            if (!doc.exists) throw new Error("Interaction not found");
            const data = doc.data() as TradeInteraction;

            if (isSuccessful) {
                // Update Interaction
                t.update(interactionRef, { status: 'CONFIRMED' });
                
                // Increment Seller Rep
                const sellerRef = db.collection('users').doc(data.sellerId);
                t.update(sellerRef, {
                    successfulTrades: firebase.firestore.FieldValue.increment(1)
                });
            } else {
                t.update(interactionRef, { status: 'CANCELLED' });
            }
        });
    },

    dismissFeedback: async (interactionId: string) => {
         await db.collection('trade_interactions').doc(interactionId).update({ status: 'IGNORED' });
    }
}

// SUBSCRIPTION SERVICE
export const subscriptionService = {
    upgradeUser: async (tier: SubscriptionTier) => {
        const user = currentUserProfile;
        if (!user) return;
        
        if (localStorage.getItem('lotus_is_guest') !== 'true') {
            await db.collection("users").doc(user.id).update({
                subscriptionTier: tier
            });
        }
        
        currentUserProfile = { ...user, subscriptionTier: tier };
    },
    
    // Check if user has reached their limit
    checkLimit: async (type: 'TRADE_BINDER' | 'WISHLIST_BINDER' | 'SHOWCASE_ITEM' | 'AUCTION_BINDER' | 'AUCTION_CARD' | 'TRADE_CARD' | 'WISHLIST_CARD', binderId?: string): Promise<{ allowed: boolean; limit: number; current: number }> => {
        if (!currentUserProfile) return { allowed: false, limit: 0, current: 0 };
        
        const tier = currentUserProfile.subscriptionTier;
        const limits = currentConfig[tier] || DEFAULT_CONFIG[tier];
        
        if (type === 'TRADE_BINDER') {
            const binders = await binderService.getUserBinders(currentUserProfile.id);
            const tradeBinders = binders.filter(b => b.type === BinderType.FOR_TRADE || b.type === BinderType.COLLECTION);
            return {
                allowed: tradeBinders.length < limits.maxTradeBinders,
                limit: limits.maxTradeBinders,
                current: tradeBinders.length
            };
        }

        if (type === 'WISHLIST_BINDER') {
            const binders = await binderService.getUserBinders(currentUserProfile.id);
            const wishBinders = binders.filter(b => b.type === BinderType.WISHLIST);
            return {
                allowed: wishBinders.length < limits.maxWishlistBinders,
                limit: limits.maxWishlistBinders,
                current: wishBinders.length
            };
        }

        if (type === 'AUCTION_BINDER') {
            const binders = await binderService.getUserBinders(currentUserProfile.id);
            const auctionBinders = binders.filter(b => b.type === BinderType.AUCTION);
            return {
                allowed: auctionBinders.length < limits.maxAuctionBinders,
                limit: limits.maxAuctionBinders,
                current: auctionBinders.length
            };
        }

        // Card Limits Checks (Used for UI Display primarily, addCard does its own check to be safe)
        if ((type === 'AUCTION_CARD' || type === 'TRADE_CARD' || type === 'WISHLIST_CARD') && binderId) {
            const cards = await cardService.getCardsInBinder(binderId);
            let limit = 0;
            if (type === 'AUCTION_CARD') limit = limits.maxAuctionCardsPerBinder;
            if (type === 'TRADE_CARD') limit = limits.maxCardsPerTradeBinder;
            if (type === 'WISHLIST_CARD') limit = limits.maxCardsPerWishlistBinder;

            return {
                allowed: cards.length < limit,
                limit: limit,
                current: cards.length
            };
        }
        
        if (type === 'SHOWCASE_ITEM') {
            const snapshot = await db.collection("cards")
                .where("userId", "==", currentUserProfile.id)
                .where("isShowcase", "==", true)
                .get();
            
            return {
                allowed: snapshot.size < limits.maxShowcaseItems,
                limit: limits.maxShowcaseItems,
                current: snapshot.size
            };
        }

        return { allowed: true, limit: 999, current: 0 };
    },

    // New Helper: Determine if a specific binder is locked for a user based on their tier limits
    // Logic: Binders are sorted by creation date. If user has 3, limit is 1, the newest 2 are locked.
    isBinderLocked: async (binder: Binder): Promise<boolean> => {
        if (!currentUserProfile) return false;
        if (binder.userId !== currentUserProfile.id) return false; // Viewing others' binders is always fine unless private (not impl)

        const allBinders = await binderService.getUserBinders(currentUserProfile.id);
        
        // Filter by same type category
        let categoryBinders: Binder[] = [];
        let limit = 0;
        const tier = currentUserProfile.subscriptionTier;
        const config = currentConfig[tier] || DEFAULT_CONFIG[tier];

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

        // Sort by creation date ascending (Oldest first)
        categoryBinders.sort((a, b) => a.createdAt - b.createdAt);

        // Find index of current binder
        const index = categoryBinders.findIndex(b => b.id === binder.id);
        
        // If index is greater than or equal to limit, it's locked (0-based index vs 1-based count)
        // e.g. Limit 1. Index 0 is safe. Index 1 is locked.
        return index >= limit;
    }
};

// ADMIN SERVICE
export const adminService = {
    assignTierByEmail: async (email: string, tier: SubscriptionTier) => {
        const snapshot = await db.collection("users").where("email", "==", email).get();
        if (snapshot.empty) {
            throw new Error(`User with email ${email} not found.`);
        }
        const userDoc = snapshot.docs[0];
        await userDoc.ref.update({ subscriptionTier: tier });
        return true;
    },

    wipeDatabase: async () => {
        const deleteCollection = async (path: string) => {
            const ref = db.collection(path);
            while (true) {
                const snap = await ref.limit(100).get();
                if (snap.empty) break;
                const batch = db.batch();
                snap.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
            }
        };

        try {
            console.log("Starting DB Wipe...");
            await deleteCollection('users');
            await deleteCollection('binders');
            await deleteCollection('cards');
            await deleteCollection('trade_interactions');
            await deleteCollection('news');
            await deleteCollection('stores');
            console.log("DB Wipe Complete.");
            return true;
        } catch (e) {
            console.error("DB Wipe Failed", e);
            throw e;
        }
    }
};

// BINDER SERVICE
export const binderService = {
  getUserBinders: async (userId: string): Promise<Binder[]> => {
    try {
        const snapshot = await db.collection("binders").where("userId", "==", userId).get();
        return snapshot.docs.map(doc => mapDoc(doc) as Binder);
    } catch (e: any) {
        console.error("Error fetching binders", e);
        return [];
    }
  },

  // NEW METHOD: Fetch specific binder by ID
  getBinder: async (binderId: string): Promise<Binder | null> => {
      try {
          const doc = await db.collection("binders").doc(binderId).get();
          if (doc.exists) {
              return mapDoc(doc) as Binder;
          }
          return null;
      } catch (e) {
          console.error("Error fetching specific binder", e);
          return null;
      }
  },

  createBinder: async (binderData: Omit<Binder, 'id' | 'createdAt' | 'cardCount'>): Promise<Binder> => {
    try {
        const newBinder = {
          ...binderData,
          createdAt: Date.now(),
          cardCount: 0
        };
        const docRef = await db.collection("binders").add(newBinder);
        return { id: docRef.id, ...newBinder } as Binder;
    } catch (e: any) {
        console.error("Detailed Create Binder Error:", e);
        throw e;
    }
  },

  deleteBinder: async (binderId: string) => {
    await db.collection("binders").doc(binderId).delete();
    
    const snapshot = await db.collection("cards").where("binderId", "==", binderId).get();
    
    const CHUNK_SIZE = 450;
    const docs = snapshot.docs;

    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
        const chunk = docs.slice(i, i + CHUNK_SIZE);
        const batch = db.batch();
        chunk.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    }
  }
};

// CARD SERVICE
export const cardService = {
  getCardsInBinder: async (binderId: string): Promise<Card[]> => {
    const snapshot = await db.collection("cards").where("binderId", "==", binderId).get();
    return snapshot.docs.map(doc => mapDoc(doc) as Card);
  },

  getTraderInventory: async (userId: string): Promise<Card[]> => {
    try {
        // 1. Get user profile to determine tier limits
        const userProfile = await auth.getUserPublicProfile(userId);
        if (!userProfile) return [];

        const tier = userProfile.subscriptionTier;
        const limits = currentConfig[tier] || DEFAULT_CONFIG[tier];

        // 2. Get user binders
        const binderSnap = await db.collection("binders").where("userId", "==", userId).get();
        const tradeBinders: Binder[] = [];
        
        binderSnap.docs.forEach(doc => {
            const data = doc.data() as Binder;
            if (data.type === BinderType.FOR_TRADE || data.type === BinderType.COLLECTION) {
                tradeBinders.push({ id: doc.id, ...data });
            }
        });

        // 3. APPLY VAULT LOGIC: Sort by date (oldest first) and take only the allowed amount
        tradeBinders.sort((a, b) => a.createdAt - b.createdAt);
        const activeBinders = tradeBinders.slice(0, limits.maxTradeBinders);
        const activeBinderIds = new Set(activeBinders.map(b => b.id));

        if (activeBinderIds.size === 0) return [];

        // 4. Get all cards and filter
        const cardSnap = await db.collection("cards").where("userId", "==", userId).get();
        const allCards = cardSnap.docs.map(doc => mapDoc(doc) as Card);

        return allCards.filter(card => activeBinderIds.has(card.binderId));
    } catch (e) {
        console.error("Error fetching trader inventory", e);
        return [];
    }
  },

  addCard: async (cardData: Omit<Card, 'id' | 'addedAt'>): Promise<Card> => {
    const binderRef = db.collection("binders").doc(cardData.binderId);
    const binderSnap = await binderRef.get();
    
    if (binderSnap.exists) {
        const binder = binderSnap.data() as Binder;
        
        // Dynamic Limit Check
        // 1. Get User's Tier (We can use currentUserProfile since they are performing action)
        if (!currentUserProfile) throw new Error("User session not found");
        
        const tier = currentUserProfile.subscriptionTier;
        const limits = currentConfig[tier] || DEFAULT_CONFIG[tier];
        
        let maxCards = 0;
        switch (binder.type) {
            case BinderType.FOR_TRADE:
            case BinderType.COLLECTION:
                maxCards = limits.maxCardsPerTradeBinder;
                break;
            case BinderType.WISHLIST:
                maxCards = limits.maxCardsPerWishlistBinder;
                break;
            case BinderType.AUCTION:
                maxCards = limits.maxAuctionCardsPerBinder;
                break;
            default:
                maxCards = 20;
        }

        const countSnap = await db.collection("cards").where("binderId", "==", cardData.binderId).get();
        const currentCount = countSnap.size;

        if (currentCount >= maxCards) {
            throw new Error(`Limit reached for this binder type. Max ${maxCards} cards.`);
        }
    }

    const newCard = {
      ...cardData,
      addedAt: Date.now(),
      isShowcase: false, 
      game: cardData.game || GameType.MTG,
      purchaseUrl: cardData.purchaseUrl ?? null,
      customPrice: cardData.customPrice ?? null,
      currency: cardData.currency ?? null,
      price: cardData.price ?? 0,
      currentBid: cardData.basePrice || 0,
      
      ...((cardData.auctionStatus || cardData.binderType === BinderType.AUCTION) && {
          auctionStatus: cardData.auctionStatus || AuctionStatus.ACTIVE
      })
    };
    
    const docRef = await db.collection("cards").add(newCard);
    
    await db.collection("binders").doc(cardData.binderId).update({
        cardCount: firebase.firestore.FieldValue.increment(1)
    });
    
    return { id: docRef.id, ...newCard } as Card;
  },

  updatePrice: async (cardId: string, customPrice: number, currency: 'USD' | 'PEN') => {
      await db.collection("cards").doc(cardId).update({ 
          customPrice,
          currency
      });
  },

  removeCard: async (cardId: string) => {
    const cardRef = db.collection("cards").doc(cardId);
    const cardSnap = await cardRef.get();
    if (!cardSnap.exists) return;
    const cardData = cardSnap.data();
    await cardRef.delete();
    if (cardData && cardData.binderId) {
        await db.collection("binders").doc(cardData.binderId).update({
            cardCount: firebase.firestore.FieldValue.increment(-1)
        });
    }
  },

  toggleShowcase: async (cardId: string, isShowcase: boolean) => {
      await db.collection("cards").doc(cardId).update({ isShowcase });
  }
};

// SHOWCASE SERVICE
export const showcaseService = {
    getShowcaseItems: async (game: GameType = GameType.MTG): Promise<ShowcaseItem[]> => {
        try {
            const snapshot = await db.collection("cards")
                .where("isShowcase", "==", true)
                .limit(50)
                .get();

            let cards = snapshot.docs.map(doc => mapDoc(doc) as Card);
            cards = cards.sort((a, b) => b.addedAt - a.addedAt);
            
            const userIds: string[] = Array.from(new Set(cards.map(c => c.userId)));
            const userMap = new Map<string, string>(); 

            await Promise.all(userIds.map(async (uid: string) => {
                try {
                    const userDoc = await db.collection("users").doc(uid).get();
                    if (userDoc.exists) {
                        userMap.set(uid, (userDoc.data() as any)?.displayName || 'Unknown Trader');
                    } else {
                        userMap.set(uid, 'Unknown Trader');
                    }
                } catch (e: any) {
                    console.warn(`Failed to fetch user ${uid}`, e);
                    userMap.set(uid, 'Unknown Trader');
                }
            }));

            const items: ShowcaseItem[] = cards.map(card => ({
                ...card,
                sellerId: card.userId,
                sellerName: userMap.get(card.userId) || 'Unknown Trader'
            }));

            return items;
        } catch (e: any) {
            console.error("Error fetching showcase items", e);
            return [];
        }
    },
    
    // Updated: Get top 10 newest
    getNewestShowcase: async (): Promise<ShowcaseItem[]> => {
        // Since we can't easily do a global sort without composite indexes on everything, 
        // we'll reuse getShowcaseItems (which fetches 50) and take top 10.
        // In production, you'd use a specific index: .orderBy('addedAt', 'desc').limit(10)
        try {
            const items = await showcaseService.getShowcaseItems();
            return items.slice(0, 10);
        } catch(e) {
            console.error("Error fetching newest showcase", e);
            return [];
        }
    }
}

// AUCTION SERVICE
export const auctionService = {
    getAllAuctions: async (): Promise<Card[]> => {
        try {
            const snapshot = await db.collection("cards")
                .where("binderType", "==", BinderType.AUCTION)
                .where("auctionStatus", "==", AuctionStatus.ACTIVE)
                .get();
                
            return snapshot.docs.map(doc => mapDoc(doc) as Card);
        } catch (e) {
            console.error("Error fetching auctions", e);
            return [];
        }
    },

    placeBid: async (card: Card, userId: string): Promise<void> => {
        if (!card.id) return;
        
        // Prevent self-bidding
        if (card.userId === userId) {
            throw new Error("You cannot bid on your own auction.");
        }

        const newBid = (card.currentBid || card.basePrice || 0) + 1;
        
        await db.collection("cards").doc(card.id).update({
            currentBid: newBid,
            topBidderId: userId
        });
    },

    directBuy: async (card: Card, userId: string): Promise<void> => {
        if (!card.id) return;

        // Prevent self-buying
        if (card.userId === userId) {
            throw new Error("You cannot buy your own auction.");
        }

        await db.collection("cards").doc(card.id).update({
            auctionStatus: AuctionStatus.SOLD,
            winnerId: userId,
            currentBid: card.buyItNowPrice // Set final price to BIN price
        });
    }
};


// MATCHING SERVICE
export const matchingService = {
  findMatches: async (currentUserId: string): Promise<MatchResult[]> => {
    const myBinderSnap = await db.collection("binders")
        .where("userId", "==", currentUserId)
        .where("type", "==", BinderType.WISHLIST)
        .get();
        
    const myBinderIds = myBinderSnap.docs.map(d => d.id);
    if (myBinderIds.length === 0) return [];

    const myCardsSnap = await db.collection("cards").where("userId", "==", currentUserId).get();
    const allMyCards = myCardsSnap.docs.map(d => mapDoc(d) as Card);
    
    const myWants = allMyCards.filter(c => myBinderIds.includes(c.binderId));
    if (myWants.length === 0) return [];
    
    const matches: MatchResult[] = [];
    const uniqueWantNames: string[] = Array.from(new Set(myWants.map(w => w.name)));
    const namesToSearch: string[] = uniqueWantNames.slice(0, 10); 
    
    if (namesToSearch.length > 0) {
        const marketSnap = await db.collection("cards")
            .where("name", "in", namesToSearch)
            .get();

        const candidates = marketSnap.docs.map(d => mapDoc(d) as Card);

        for (const candidate of candidates) {
            const candidateUserId = String(candidate.userId);
            if (candidateUserId === currentUserId) continue; 

            // SMART MATCHING LOGIC
            // 1. Try to find a wishlist item that matches both Name and ScryfallID (Exact Version)
            const exactWant = myWants.find(w => w.name === candidate.name && w.scryfallId === candidate.scryfallId);
            // 2. Fallback: Find any wishlist item with the same name
            const looseWant = myWants.find(w => w.name === candidate.name);

            const wantCard = exactWant || looseWant;

            if (wantCard) {
                const matchType = exactWant ? 'EXACT' : 'LOOSE';
                
                let sellerProfile: UserProfile = {
                    id: candidateUserId,
                    displayName: 'Remote User', 
                    email: '',
                    isOnline: false,
                    subscriptionTier: SubscriptionTier.COMMON,
                    successfulTrades: 0,
                    preferredGame: ''
                };

                try {
                    const userDoc = await db.collection("users").doc(candidateUserId).get();
                    if (userDoc.exists) {
                        sellerProfile = { ...sellerProfile, ...(userDoc.data() as any) };
                    }
                } catch (e: any) {
                    console.warn("Could not fetch seller details", e);
                }

                matches.push({
                    card: wantCard,
                    matchCard: candidate,
                    seller: sellerProfile,
                    matchType: matchType
                });
            }
        }
    }
    
    return matches;
  }
};

// NEW SERVICES
export const newsService = {
    getNews: async (): Promise<NewsItem[]> => {
        try {
            const snap = await db.collection("news").orderBy('date', 'desc').limit(20).get();
            return snap.docs.map(d => mapDoc(d) as NewsItem);
        } catch (e) {
            console.error("Error fetching news", e);
            return [];
        }
    },
    addNews: async (news: Omit<NewsItem, 'id'>) => {
        await db.collection("news").add(news);
    },
    deleteNews: async (id: string) => {
        await db.collection("news").doc(id).delete();
    }
};

export const storeDirectoryService = {
    getStores: async (): Promise<StoreProfile[]> => {
        try {
            const snap = await db.collection("stores").get();
            return snap.docs.map(d => mapDoc(d) as StoreProfile);
        } catch (e) {
            console.error("Error fetching stores", e);
            return [];
        }
    },
    addStore: async (store: Omit<StoreProfile, 'id'>) => {
        await db.collection("stores").add(store);
    },
    deleteStore: async (id: string) => {
        await db.collection("stores").doc(id).delete();
    }
};

export const messagingService = {
    getMessages: async (userId: string): Promise<ChatMessage[]> => {
        return [];
    },
    sendMessage: async (senderId: string, receiverId: string, content: string) => {
        return {} as ChatMessage;
    }
};
