
import firebase from 'firebase/compat/app';
import { auth as firebaseAuth, googleProvider, db } from './firebase';
import { Binder, BinderType, Card, CardCondition, ChatMessage, GameType, MatchResult, UserProfile, ShowcaseItem, SubscriptionTier, GlobalConfig, AuctionStatus, TierLimits } from '../types';

// CONVERSION UTILS
const mapDoc = (doc: any): any => ({ id: doc.id, ...doc.data() });

// CONSTANTS
export const BINDER_CARD_LIMIT = 25;

// DEFAULTS
const DEFAULT_CONFIG: GlobalConfig = {
    [SubscriptionTier.COMMON]: { 
        maxTradeBinders: 1, 
        maxShowcaseItems: 3, 
        maxAuctionBinders: 1, 
        maxAuctionCardsPerBinder: 1, 
        maxCardAlerts: 1,
        pricePerMonth: 0,
        currency: 'USD'
    },
    [SubscriptionTier.UNCOMMON]: { 
        maxTradeBinders: 3, 
        maxShowcaseItems: 10, 
        maxAuctionBinders: 2, 
        maxAuctionCardsPerBinder: 10, 
        maxCardAlerts: 5,
        pricePerMonth: 5,
        currency: 'USD'
    },
    [SubscriptionTier.RARE]: { 
        maxTradeBinders: 10, 
        maxShowcaseItems: 50, 
        maxAuctionBinders: 3, 
        maxAuctionCardsPerBinder: 15, 
        maxCardAlerts: 20,
        pricePerMonth: 15,
        currency: 'USD'
    },
    [SubscriptionTier.MYTHIC]: { 
        maxTradeBinders: 100, 
        maxShowcaseItems: 500, 
        maxAuctionBinders: 10, 
        maxAuctionCardsPerBinder: 50, 
        maxCardAlerts: 100,
        pricePerMonth: 0, // Reserved for stores (custom)
        currency: 'USD'
    },
};

// AUTH SERVICE
let currentUserProfile: UserProfile | null = null;
let currentConfig: GlobalConfig = DEFAULT_CONFIG;

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
        ...customData
      };

      await userRef.set({
          displayName: profile.displayName,
          email: profile.email,
          photoURL: profile.photoURL,
          lastLogin: Date.now(),
          // Don't overwrite tier if it exists (allows admin to set Mythic)
          subscriptionTier: customData.subscriptionTier || profile.subscriptionTier,
          isAdmin: profile.isAdmin
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
          isAdmin: false
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
                  subscriptionTier: data.subscriptionTier || SubscriptionTier.COMMON
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
                isAdmin: false
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
            const doc = await db.collection("settings").doc("global").get();
            if (doc.exists) {
                // Merge with defaults to ensure new keys (auction) exist even if DB is old
                const data = doc.data() as GlobalConfig;
                currentConfig = {
                    [SubscriptionTier.COMMON]: { ...DEFAULT_CONFIG[SubscriptionTier.COMMON], ...(data[SubscriptionTier.COMMON] || {}) },
                    [SubscriptionTier.UNCOMMON]: { ...DEFAULT_CONFIG[SubscriptionTier.UNCOMMON], ...(data[SubscriptionTier.UNCOMMON] || {}) },
                    [SubscriptionTier.RARE]: { ...DEFAULT_CONFIG[SubscriptionTier.RARE], ...(data[SubscriptionTier.RARE] || {}) },
                    [SubscriptionTier.MYTHIC]: { ...DEFAULT_CONFIG[SubscriptionTier.MYTHIC], ...(data[SubscriptionTier.MYTHIC] || {}) },
                };
            } else {
                // Initialize default config if missing
                await db.collection("settings").doc("global").set(DEFAULT_CONFIG);
                currentConfig = DEFAULT_CONFIG;
            }
        } catch (e) {
            console.warn("Using default config (offline)", e);
            currentConfig = DEFAULT_CONFIG;
        }
        return currentConfig;
    },
    getConfig: () => currentConfig,
    updateConfig: async (newConfig: GlobalConfig) => {
        await db.collection("settings").doc("global").set(newConfig);
        currentConfig = newConfig;
    }
};

// SUBSCRIPTION SERVICE
export const subscriptionService = {
    upgradeUser: async (tier: SubscriptionTier) => {
        const user = currentUserProfile;
        if (!user) return;
        
        // In a real app, this would verify payment token on backend
        // Here we just update the Firestore doc directly
        if (localStorage.getItem('lotus_is_guest') !== 'true') {
            await db.collection("users").doc(user.id).update({
                subscriptionTier: tier
            });
        }
        
        // Update local state
        currentUserProfile = { ...user, subscriptionTier: tier };
    },
    
    // Check if user has reached their limit
    checkLimit: async (type: 'TRADE_BINDER' | 'SHOWCASE_ITEM' | 'AUCTION_BINDER' | 'AUCTION_CARD', binderId?: string): Promise<{ allowed: boolean; limit: number; current: number }> => {
        if (!currentUserProfile) return { allowed: false, limit: 0, current: 0 };
        
        const tier = currentUserProfile.subscriptionTier;
        const limits = currentConfig[tier] || DEFAULT_CONFIG[tier];
        
        if (type === 'TRADE_BINDER') {
            const binders = await binderService.getUserBinders(currentUserProfile.id);
            const tradeBinders = binders.filter(b => b.type === BinderType.FOR_TRADE);
            return {
                allowed: tradeBinders.length < limits.maxTradeBinders,
                limit: limits.maxTradeBinders,
                current: tradeBinders.length
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

        if (type === 'AUCTION_CARD' && binderId) {
            const cards = await cardService.getCardsInBinder(binderId);
            return {
                allowed: cards.length < limits.maxAuctionCardsPerBinder,
                limit: limits.maxAuctionCardsPerBinder,
                current: cards.length
            };
        }
        
        if (type === 'SHOWCASE_ITEM') {
            // Count user's showcase items
            // Optimization: In production, store 'showcaseCount' on user profile to avoid query
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
        
        // Return true on success
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
    // 1. Delete Binder Document
    await db.collection("binders").doc(binderId).delete();
    
    // 2. Query all cards in this binder
    const snapshot = await db.collection("cards").where("binderId", "==", binderId).get();
    
    // 3. Batch delete cards (Firestore limits batch to 500 ops)
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

  addCard: async (cardData: Omit<Card, 'id' | 'addedAt'>): Promise<Card> => {
    // 1. Check Binder Limit
    // First, check general card limit (25)
    // NOTE: For Auction Binders, the limit is strictly handled by Subscription Tier logic passed in. 
    // But we still respect the hard 25 cap if not overridden, though auction limits are usually lower.
    
    // 2. Check Role-Based Limits if it's an Auction Binder
    const binderRef = db.collection("binders").doc(cardData.binderId);
    const binderSnap = await binderRef.get();
    
    if (binderSnap.exists) {
        const binder = binderSnap.data() as Binder;
        
        // Safety count check
        const countSnap = await db.collection("cards").where("binderId", "==", cardData.binderId).get();
        const currentCount = countSnap.size;

        if (binder.type === BinderType.AUCTION) {
            // Re-verify limit on server-side logic (simulated here)
            // Ideally we pass the check result from UI, but for safety:
            // We'll trust the caller has checked subscriptionService.checkLimit for now or fallback to hard limit
            // But let's check general hard cap
            if (currentCount >= 25) {
                 throw new Error("Hard storage limit reached (25).");
            }
        } else {
             if (currentCount >= BINDER_CARD_LIMIT) {
                throw new Error(`Binder Limit Reached. Max ${BINDER_CARD_LIMIT} cards allowed.`);
             }
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
      
      // Defaults for auction - Use conditional spread to ensure 'undefined' is never passed as a value
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

            const wantCard = myWants.find(w => w.name === candidate.name);
            if (wantCard) {
                let sellerProfile: UserProfile = {
                    id: candidateUserId,
                    displayName: 'Remote User', 
                    email: '',
                    isOnline: false,
                    subscriptionTier: SubscriptionTier.COMMON
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
                    seller: sellerProfile
                });
            }
        }
    }
    
    return matches;
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