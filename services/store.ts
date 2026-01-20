
import firebase from 'firebase/compat/app';
import { auth as firebaseAuth, googleProvider, db } from './firebase';
import { Binder, BinderType, Card, CardCondition, GameType, MatchResult, UserProfile, ShowcaseItem, SubscriptionTier, GlobalConfig, AuctionStatus, TierLimits, SystemConfig, TradeInteraction, NewsItem, StoreProfile, AppNotification, CardAlert, FeedbackValue } from '../types';
import { oneSignalService } from './onesignalService';
import { auditAndRefreshPrices } from './scryfallService';

// CONVERSION UTILS
const mapDoc = (doc: any): any => ({ id: doc.id, ...doc.data() });

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
        currency: 'USD',
        paymentLink: ''
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
        currency: 'USD',
        paymentLink: ''
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
        currency: 'USD',
        paymentLink: ''
    },
    [SubscriptionTier.MYTHIC]: { 
        maxTradeBinders: 100, 
        maxCardsPerTradeBinder: 500,
        maxWishlistBinders: 0, 
        maxCardsPerWishlistBinder: 0,
        maxAuctionBinders: 10, 
        maxAuctionCardsPerBinder: 50, 
        maxShowcaseItems: 500, 
        maxCardAlerts: 100,
        pricePerMonth: 0, 
        currency: 'USD',
        paymentLink: ''
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

      // CORRECCIÓN: Eliminada validación por correo electrónico. 
      // Se utiliza estrictamente el campo isAdmin de Firestore.
      const isAdmin = !!customData.isAdmin;

      const profile: UserProfile = {
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Unnamed Trader',
        photoURL: user.photoURL || undefined,
        isOnline: true,
        subscriptionTier: customData.subscriptionTier || SubscriptionTier.COMMON,
        isAdmin: isAdmin,
        traderScore: customData.traderScore || customData.successfulTrades || 0,
        searcherScore: customData.searcherScore || 0,
        preferredGame: customData.preferredGame || '',
        ...customData
      };

      await userRef.set({
          displayName: profile.displayName,
          email: profile.email,
          photoURL: profile.photoURL,
          lastLogin: Date.now(),
          subscriptionTier: customData.subscriptionTier || profile.subscriptionTier,
          isAdmin: profile.isAdmin,
          traderScore: profile.traderScore,
          searcherScore: profile.searcherScore,
          preferredGame: profile.preferredGame || null
      }, { merge: true });

      currentUserProfile = profile;
      localStorage.removeItem('lotus_is_guest');
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
          traderScore: 0,
          searcherScore: 0,
          preferredGame: ''
      };
      
      currentUserProfile = guestProfile;
      await configService.loadConfig();
      return guestProfile;
  },
  getCurrentUser: () => currentUserProfile,
  getUserPublicProfile: async (userId: string): Promise<UserProfile | null> => {
      try {
          const doc = await db.collection("users").doc(userId).get();
          if (doc.exists) {
              const data = doc.data() as any;
              return { 
                  id: doc.id, 
                  ...data,
                  subscriptionTier: data.subscriptionTier || SubscriptionTier.COMMON,
                  traderScore: data.traderScore || data.successfulTrades || 0,
                  searcherScore: data.searcherScore || 0
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
              preferredGame: updates.preferredGame || null,
              storeAnnouncement: updates.storeAnnouncement || null,
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

        // CORRECCIÓN: Validación estricta por campo isAdmin de Firestore.
        const isAdmin = !!customData.isAdmin;

        const profile: UserProfile = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'Unnamed Trader',
            photoURL: firebaseUser.photoURL || undefined,
            isOnline: true,
            subscriptionTier: customData.subscriptionTier || SubscriptionTier.COMMON,
            isAdmin: isAdmin,
            traderScore: customData.traderScore || customData.successfulTrades || 0,
            searcherScore: customData.searcherScore || 0,
            preferredGame: customData.preferredGame || '',
            ...customData
        };
        currentUserProfile = profile;
        await configService.loadConfig();
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
                traderScore: 0,
                searcherScore: 0,
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

// NOTIFICATION SERVICE
export const notificationService = {
    send: async (userId: string, type: 'OUTBID' | 'WISH_ALERT' | 'SYSTEM', title: string, message: string, linkUrl?: string, imageUrl?: string) => {
        try {
            const notification: Omit<AppNotification, 'id'> = {
                userId, type, title, message, linkUrl, imageUrl, read: false, createdAt: Date.now()
            };
            await db.collection("notifications").add(notification);
        } catch (e) {
            console.error("Failed to send notification", e);
        }
    },
    markAsRead: async (notificationId: string) => {
        await db.collection("notifications").doc(notificationId).update({ read: true });
    },
    markAllAsRead: async (userId: string) => {
        const snap = await db.collection("notifications").where("userId", "==", userId).where("read", "==", false).get();
        const batch = db.batch();
        snap.docs.forEach(doc => batch.update(doc.ref, { read: true }));
        await batch.commit();
    },
    cleanup: async (userId: string) => {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const snap = await db.collection("notifications").where("userId", "==", userId).where("createdAt", "<", thirtyDaysAgo).get();
        const batch = db.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        if (!snap.empty) await batch.commit();
    }
};

// ALERT SERVICE
export const alertService = {
    isWatching: async (userId: string, cardName: string): Promise<boolean> => {
        const id = `${userId}_${cardName.replace(/\//g, '_')}`;
        const doc = await db.collection("active_alerts").doc(id).get();
        return doc.exists;
    },
    toggleAlert: async (userId: string, cardName: string): Promise<boolean> => {
        const id = `${userId}_${cardName.replace(/\//g, '_')}`;
        const ref = db.collection("active_alerts").doc(id);
        const doc = await ref.get();
        if (doc.exists) {
            await ref.delete();
            return false;
        } else {
            const limits = await subscriptionService.checkLimit('CARD_ALERT');
            if (!limits.allowed) throw new Error(`Alert limit reached (${limits.limit}). Upgrade your plan to track more cards.`);
            await ref.set({ userId, cardName, createdAt: Date.now() });
            return true;
        }
    },
    findWatchers: async (cardName: string): Promise<string[]> => {
        const snap = await db.collection("active_alerts").where("cardName", "==", cardName).get();
        return snap.docs.map(d => (d.data() as CardAlert).userId);
    }
};

// TRADE & REPUTATION SERVICE
export const tradeService = {
    logInteraction: async (sellerId: string, sellerName: string, cardName: string = 'General Inquiry') => {
        if (!currentUserProfile) return;
        if (currentUserProfile.id === sellerId) return; 

        try {
            const recentSnap = await db.collection('trade_interactions')
                .where('buyerId', '==', currentUserProfile.id)
                .where('sellerId', '==', sellerId)
                .where('status', '==', 'PENDING')
                .get();

            if (!recentSnap.empty) {
                const interactions = recentSnap.docs.map(d => d.data());
                interactions.sort((a, b) => b.timestamp - a.timestamp);
                const last = interactions[0];
                if (Date.now() - last.timestamp < 24 * 60 * 60 * 1000) return; 
            }

            const interaction: Omit<TradeInteraction, 'id'> = {
                buyerId: currentUserProfile.id,
                buyerName: currentUserProfile.displayName,
                sellerId,
                sellerName,
                cardName,
                timestamp: Date.now(),
                status: 'PENDING'
            };

            await db.collection('trade_interactions').add(interaction);
            
            // Notify Seller
            oneSignalService.sendNotification(
                "¡Atención!",
                `Un Searcher te ha contactado por tu ${cardName}.`,
                [sellerId]
            ).catch(err => console.error("Push Notification Failed", err));

        } catch (e) {
            console.error("Failed to log trade interaction", e);
        }
    },

    getPendingFeedback: async (): Promise<TradeInteraction[]> => {
        if (!currentUserProfile) return [];
        const uid = currentUserProfile.id;
        try {
            const buyerSnap = await db.collection('trade_interactions')
                .where('buyerId', '==', uid)
                .where('status', '==', 'PENDING')
                .get();
            
            const sellerSnap = await db.collection('trade_interactions')
                .where('sellerId', '==', uid)
                .where('status', '==', 'PENDING')
                .get();

            const all = [...buyerSnap.docs, ...sellerSnap.docs].map(doc => mapDoc(doc) as TradeInteraction);
            const now = Date.now();
            const minTime = currentSystemConfig.minTradeConfirmHours * 60 * 60 * 1000;

            return all.filter(i => {
                const isBuyer = i.buyerId === uid;
                const isSeller = i.sellerId === uid;
                if (isBuyer && i.buyerFeedback !== undefined) return false;
                if (isSeller && i.sellerFeedback !== undefined) return false;
                return (now - i.timestamp) >= minTime;
            });
        } catch (e) {
            console.error("Failed to get pending feedback", e);
            return [];
        }
    },

    submitFeedback: async (interactionId: string, feedback: FeedbackValue) => {
        if (!currentUserProfile) return;
        const uid = currentUserProfile.id;
        const interactionRef = db.collection('trade_interactions').doc(interactionId);

        await db.runTransaction(async (t) => {
            const doc = await t.get(interactionRef);
            if (!doc.exists) throw new Error("Interaction not found");
            const data = doc.data() as TradeInteraction;

            const isBuyer = data.buyerId === uid;
            const updates: Partial<TradeInteraction> = isBuyer 
                ? { buyerFeedback: feedback, buyerConfirmedAt: Date.now() }
                : { sellerFeedback: feedback, sellerConfirmedAt: Date.now() };

            const nextData = { ...data, ...updates };
            const bothAnswered = (nextData.buyerFeedback !== undefined && nextData.sellerFeedback !== undefined);

            if (bothAnswered) {
                let buyerAward = 0;
                let sellerAward = 0;
                const buyerVal = nextData.buyerFeedback!;
                const sellerVal = nextData.sellerFeedback!;

                if (buyerVal !== FeedbackValue.NO_CONCRETADO && sellerVal === FeedbackValue.NO_CONCRETADO) {
                    buyerAward = 1;
                    sellerAward = 1;
                } else if (buyerVal !== FeedbackValue.NO_CONCRETADO && sellerVal !== FeedbackValue.NO_CONCRETADO) {
                    buyerAward = sellerVal as number;
                    sellerAward = buyerVal as number;
                }

                if (buyerAward !== 0) {
                    t.update(db.collection('users').doc(data.buyerId), {
                        searcherScore: firebase.firestore.FieldValue.increment(buyerAward)
                    });
                }
                if (sellerAward !== 0) {
                    t.update(db.collection('users').doc(data.sellerId), {
                        traderScore: firebase.firestore.FieldValue.increment(sellerAward)
                    });
                }
                updates.status = 'COMPLETED';
            }
            t.update(interactionRef, updates);
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
            await db.collection("users").doc(user.id).update({ subscriptionTier: tier });
        }
        currentUserProfile = { ...user, subscriptionTier: tier };
    },
    checkLimit: async (type: 'TRADE_BINDER' | 'WISHLIST_BINDER' | 'SHOWCASE_ITEM' | 'AUCTION_BINDER' | 'AUCTION_CARD' | 'TRADE_CARD' | 'WISHLIST_CARD' | 'CARD_ALERT', binderId?: string): Promise<{ allowed: boolean; limit: number; current: number }> => {
        if (!currentUserProfile) return { allowed: false, limit: 0, current: 0 };
        const tier = currentUserProfile.subscriptionTier;
        const limits = currentConfig[tier] || DEFAULT_CONFIG[tier];
        if (type === 'TRADE_BINDER') {
            const binders = await binderService.getUserBinders(currentUserProfile.id);
            const tradeBinders = binders.filter(b => b.type === BinderType.FOR_TRADE || b.type === BinderType.COLLECTION);
            return { allowed: tradeBinders.length < limits.maxTradeBinders, limit: limits.maxTradeBinders, current: tradeBinders.length };
        }
        if (type === 'WISHLIST_BINDER') {
            const binders = await binderService.getUserBinders(currentUserProfile.id);
            const wishBinders = binders.filter(b => b.type === BinderType.WISHLIST);
            return { allowed: wishBinders.length < limits.maxWishlistBinders, limit: limits.maxWishlistBinders, current: wishBinders.length };
        }
        if (type === 'AUCTION_BINDER') {
            const binders = await binderService.getUserBinders(currentUserProfile.id);
            const auctionBinders = binders.filter(b => b.type === BinderType.AUCTION);
            return { allowed: auctionBinders.length < limits.maxAuctionBinders, limit: limits.maxAuctionBinders, current: auctionBinders.length };
        }
        if ((type === 'AUCTION_CARD' || type === 'TRADE_CARD' || type === 'WISHLIST_CARD') && binderId) {
            const cards = await cardService.getCardsInBinder(binderId);
            let limit = 0;
            if (type === 'AUCTION_CARD') limit = limits.maxAuctionCardsPerBinder;
            if (type === 'TRADE_CARD') limit = limits.maxCardsPerTradeBinder;
            if (type === 'WISHLIST_CARD') limit = limits.maxCardsPerWishlistBinder;
            return { allowed: cards.length < limit, limit: limit, current: cards.length };
        }
        if (type === 'SHOWCASE_ITEM') {
            const snapshot = await db.collection("cards").where("userId", "==", currentUserProfile.id).where("isShowcase", "==", true).get();
            return { allowed: snapshot.size < limits.maxShowcaseItems, limit: limits.maxShowcaseItems, current: snapshot.size };
        }
        if (type === 'CARD_ALERT') {
            const snapshot = await db.collection("active_alerts").where("userId", "==", currentUserProfile.id).get();
            return { allowed: snapshot.size < limits.maxCardAlerts, limit: limits.maxCardAlerts, current: snapshot.size };
        }
        return { allowed: true, limit: 999, current: 0 };
    },
    isBinderLocked: async (binder: Binder): Promise<boolean> => {
        if (!currentUserProfile) return false;
        if (binder.userId !== currentUserProfile.id) return false;
        const allBinders = await binderService.getUserBinders(currentUserProfile.id);
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
        categoryBinders.sort((a, b) => a.createdAt - b.createdAt);
        const index = categoryBinders.findIndex(b => b.id === binder.id);
        return index >= limit;
    }
};

// ADMIN SERVICE
export const adminService = {
    assignTierByEmail: async (email: string, tier: SubscriptionTier) => {
        const snapshot = await db.collection("users").where("email", "==", email).get();
        if (snapshot.empty) throw new Error(`User with email ${email} not found.`);
        await snapshot.docs[0].ref.update({ subscriptionTier: tier });
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
            await deleteCollection('users');
            await deleteCollection('binders');
            await deleteCollection('cards');
            await deleteCollection('trade_interactions');
            await deleteCollection('news');
            await deleteCollection('stores');
            await deleteCollection('notifications');
            await deleteCollection('active_alerts');
            return true;
        } catch (e) { console.error("DB Wipe Failed", e); throw e; }
    }
};

// BINDER SERVICE
export const binderService = {
  getUserBinders: async (userId: string): Promise<Binder[]> => {
    try {
        const snapshot = await db.collection("binders").where("userId", "==", userId).get();
        return snapshot.docs.map(doc => mapDoc(doc) as Binder);
    } catch (e: any) { return []; }
  },
  getBinder: async (binderId: string): Promise<Binder | null> => {
      try {
          const doc = await db.collection("binders").doc(binderId).get();
          if (doc.exists) return mapDoc(doc) as Binder;
          return null;
      } catch (e) { return null; }
  },
  createBinder: async (binderData: Omit<Binder, 'id' | 'createdAt' | 'cardCount'>): Promise<Binder> => {
    try {
        const newBinder = { ...binderData, createdAt: Date.now(), cardCount: 0 };
        const docRef = await db.collection("binders").add(newBinder);
        return { id: docRef.id, ...newBinder } as Binder;
    } catch (e: any) { throw e; }
  },
  deleteBinder: async (binderId: string) => {
    await db.collection("binders").doc(binderId).delete();
    const snapshot = await db.collection("cards").where("binderId", "==", binderId).get();
    const CHUNK_SIZE = 450;
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
        const chunk = docs.slice(i, i + CHUNK_SIZE);
        const batch = db.batch();
        chunk.forEach((doc) => batch.delete(doc.ref));
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
        const userProfile = await auth.getUserPublicProfile(userId);
        if (!userProfile) return [];
        const tier = userProfile.subscriptionTier;
        const limits = currentConfig[tier] || DEFAULT_CONFIG[tier];
        const binderSnap = await db.collection("binders").where("userId", "==", userId).get();
        const tradeBinders: Binder[] = [];
        binderSnap.docs.forEach(doc => {
            const data = doc.data() as Binder;
            if (data.type === BinderType.FOR_TRADE || data.type === BinderType.COLLECTION) tradeBinders.push({ id: doc.id, ...data });
        });
        tradeBinders.sort((a, b) => a.createdAt - b.createdAt);
        const activeBinders = tradeBinders.slice(0, limits.maxTradeBinders);
        const activeBinderIds = new Set(activeBinders.map(b => b.id));
        if (activeBinderIds.size === 0) return [];
        const cardSnap = await db.collection("cards").where("userId", "==", userId).get();
        const allCards = cardSnap.docs.map(doc => mapDoc(doc) as Card);
        return allCards.filter(card => activeBinderIds.has(card.binderId));
    } catch (e) { return []; }
  },
  addCard: async (cardData: Omit<Card, 'id' | 'addedAt'>): Promise<Card> => {
    const binderRef = db.collection("binders").doc(cardData.binderId);
    const binderSnap = await binderRef.get();
    let isAuction = false;
    if (binderSnap.exists) {
        const binder = binderSnap.data() as Binder;
        isAuction = binder.type === BinderType.AUCTION;
        if (!currentUserProfile) throw new Error("User session not found");
        const tier = currentUserProfile.subscriptionTier;
        const limits = currentConfig[tier] || DEFAULT_CONFIG[tier];
        let maxCards = (binder.type === BinderType.FOR_TRADE || binder.type === BinderType.COLLECTION) ? limits.maxCardsPerTradeBinder : (binder.type === BinderType.WISHLIST ? limits.maxCardsPerWishlistBinder : (isAuction ? limits.maxAuctionCardsPerBinder : 20));
        const countSnap = await db.collection("cards").where("binderId", "==", cardData.binderId).get();
        if (countSnap.size >= maxCards) throw new Error(`Limit reached for this binder type. Max ${maxCards} cards.`);
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
      quantity: isAuction ? 1 : (cardData.quantity || 1),
      ...((cardData.auctionStatus || cardData.binderType === BinderType.AUCTION) && { auctionStatus: cardData.auctionStatus || AuctionStatus.ACTIVE })
    };
    const docRef = await db.collection("cards").add(newCard);
    await db.collection("binders").doc(cardData.binderId).update({ cardCount: firebase.firestore.FieldValue.increment(1) });
    const isTradeable = !cardData.binderType || cardData.binderType === BinderType.FOR_TRADE || cardData.binderType === BinderType.AUCTION;
    if (isTradeable) {
        alertService.findWatchers(newCard.name).then(watcherIds => {
            watcherIds.forEach(userId => {
                if (userId !== newCard.userId) {
                    notificationService.send(userId, 'WISH_ALERT', `Found: ${newCard.name}`, `${currentUserProfile?.displayName} just listed a card on your wishlist!`, `/?binder=${newCard.binderId}`, newCard.imageUrl);
                }
            });
        }).catch(e => console.error("Error triggering alerts", e));
    }
    return { id: docRef.id, ...newCard } as Card;
  },
  updatePrice: async (cardId: string, customPrice: number, currency: 'USD' | 'PEN') => {
      await db.collection("cards").doc(cardId).update({ customPrice, currency });
  },
  syncBinderPrices: async (binderId: string, cards: Card[]) => {
      // 1. Identify cards that haven't been synced in library or are old
      const scryfallIds = Array.from(new Set(cards.map(c => c.scryfallId)));
      const freshPrices = await auditAndRefreshPrices(scryfallIds);

      // 2. Batch update card documents if price has changed significantly or is out of sync
      const batch = db.batch();
      let hasUpdates = false;

      for (const card of cards) {
          const newPrice = freshPrices[card.scryfallId];
          if (newPrice !== undefined && newPrice !== card.price) {
              const ref = db.collection("cards").doc(card.id);
              batch.update(ref, { price: newPrice });
              hasUpdates = true;
          }
      }

      if (hasUpdates) {
          await batch.commit();
      }
  },
  removeCard: async (cardId: string) => {
    const cardRef = db.collection("cards").doc(cardId);
    const cardSnap = await cardRef.get();
    if (!cardSnap.exists) return;
    const cardData = cardSnap.data();
    await cardRef.delete();
    if (cardData && cardData.binderId) await db.collection("binders").doc(cardData.binderId).update({ cardCount: firebase.firestore.FieldValue.increment(-1) });
  },
  toggleShowcase: async (cardId: string, isShowcase: boolean) => {
      await db.collection("cards").doc(cardId).update({ isShowcase });
  }
};

// SHOWCASE SERVICE
export const showcaseService = {
    getShowcaseItems: async (game: GameType = GameType.MTG): Promise<ShowcaseItem[]> => {
        try {
            const snapshot = await db.collection("cards").where("isShowcase", "==", true).limit(50).get();
            let cards = snapshot.docs.map(doc => mapDoc(doc) as Card);
            cards = cards.sort((a, b) => b.addedAt - a.addedAt);
            const userIds: string[] = Array.from(new Set(cards.map(c => c.userId)));
            const userMap = new Map<string, string>(); 
            await Promise.all(userIds.map(async (uid: string) => {
                try {
                    const userDoc = await db.collection("users").doc(uid).get();
                    userMap.set(uid, (userDoc.data() as any)?.displayName || 'Unknown Trader');
                } catch (e: any) { userMap.set(uid, 'Unknown Trader'); }
            }));
            return cards.map(card => ({ ...card, sellerId: card.userId, sellerName: userMap.get(card.userId) || 'Unknown Trader' }));
        } catch (e: any) { return []; }
    },
    getNewestShowcase: async (): Promise<ShowcaseItem[]> => {
        try {
            const items = await showcaseService.getShowcaseItems();
            return items.slice(0, 10);
        } catch(e) { return []; }
    }
}

// AUCTION SERVICE
export const auctionService = {
    getAllAuctions: async (): Promise<Card[]> => {
        try {
            const snapshot = await db.collection("cards").where("binderType", "==", BinderType.AUCTION).where("auctionStatus", "==", AuctionStatus.ACTIVE).get();
            return snapshot.docs.map(doc => mapDoc(doc) as Card);
        } catch (e) { return []; }
    },
    placeBid: async (card: Card, userId: string): Promise<void> => {
        if (!card.id) return;
        if (card.userId === userId) throw new Error("You cannot bid on your own auction.");
        const newBid = (card.currentBid || card.basePrice || 0) + 1;
        const prevBidderId = card.topBidderId;
        const updates: any = { currentBid: newBid, topBidderId: userId };
        if (card.auctionEndDate) {
            const now = Date.now();
            const timeLeft = card.auctionEndDate - now;
            if (timeLeft < 5 * 60 * 1000 && timeLeft > 0) updates.auctionEndDate = now + 5 * 60 * 1000;
        }
        await db.collection("cards").doc(card.id).update(updates);
        if (prevBidderId && prevBidderId !== userId) {
            notificationService.send(prevBidderId, 'OUTBID', 'You have been outbid!', `Someone bid ${card.currency === 'PEN' ? 'S/' : '$'} ${newBid} on ${card.name}. Bid again!`, '/auctions', card.imageUrl);
            oneSignalService.sendNotification("You have been outbid!", `Someone bid ${card.currency === 'PEN' ? 'S/' : '$'} ${newBid} on ${card.name}. Tap to reclaim your glory!`, [prevBidderId], `${window.location.origin}/?binder=${card.binderId}`).catch(err => console.error("Push Notification Failed", err));
        }
    },
    directBuy: async (card: Card, userId: string): Promise<void> => {
        if (!card.id) return;
        if (card.userId === userId) throw new Error("You cannot buy your own auction.");
        await db.collection("cards").doc(card.id).update({ auctionStatus: AuctionStatus.SOLD, winnerId: userId, currentBid: card.buyItNowPrice });
        notificationService.send(card.userId, 'SYSTEM', 'Auction Sold!', `Your ${card.name} was bought instantly for ${card.buyItNowPrice}. Contact the winner!`, `/?trader=${userId}`, card.imageUrl);
        oneSignalService.sendNotification("Auction Sold!", `Your ${card.name} was bought instantly! Check your dashboard.`, [card.userId]).catch(err => console.error("Push Notification Failed", err));
    }
};

// MATCHING SERVICE
export const matchingService = {
  findMatches: async (currentUserId: string): Promise<MatchResult[]> => {
    const myBinderSnap = await db.collection("binders").where("userId", "==", currentUserId).where("type", "==", BinderType.WISHLIST).get();
    const myBinderIds = myBinderSnap.docs.map(d => d.id);
    if (myBinderIds.length === 0) return [];
    const myWantsSnap = await db.collection("cards").where("userId", "==", currentUserId).get();
    const allMyCards = myWantsSnap.docs.map(d => mapDoc(d) as Card);
    const myWants = allMyCards.filter(c => myBinderIds.includes(c.binderId));
    if (myWants.length === 0) return [];
    const matches: MatchResult[] = [];
    const uniqueWantNames: string[] = Array.from(new Set(myWants.map(w => w.name)));
    const namesToSearch: string[] = uniqueWantNames.slice(0, 10); 
    if (namesToSearch.length > 0) {
        const marketSnap = await db.collection("cards").where("name", "in", namesToSearch).get();
        const candidates = marketSnap.docs.map(d => mapDoc(d) as Card);
        for (const candidate of candidates) {
            const candidateUserId = String(candidate.userId);
            if (candidateUserId === currentUserId) continue; 
            const exactWant = myWants.find(w => w.name === candidate.name && w.scryfallId === candidate.scryfallId);
            const looseWant = myWants.find(w => w.name === candidate.name);
            const wantCard = exactWant || looseWant;
            if (wantCard) {
                let sellerProfile: UserProfile = { id: candidateUserId, displayName: 'Remote User', email: '', isOnline: false, subscriptionTier: SubscriptionTier.COMMON, traderScore: 0, searcherScore: 0, preferredGame: '' };
                try {
                    const userDoc = await db.collection("users").doc(candidateUserId).get();
                    if (userDoc.exists) sellerProfile = { ...sellerProfile, ...(userDoc.data() as any) };
                } catch (e: any) {}
                matches.push({ card: wantCard, matchCard: candidate, seller: sellerProfile, matchType: exactWant ? 'EXACT' : 'LOOSE' });
            }
        }
    }
    return matches;
  }
};

// NEWS & STORE SERVICES
export const newsService = {
    getNews: async (): Promise<NewsItem[]> => {
        try {
            const snap = await db.collection("news").orderBy('date', 'desc').limit(20).get();
            return snap.docs.map(d => mapDoc(d) as NewsItem);
        } catch (e) { return []; }
    },
    addNews: async (news: Omit<NewsItem, 'id'>) => { await db.collection("news").add(news); },
    deleteNews: async (id: string) => { await db.collection("news").doc(id).delete(); }
};
export const storeDirectoryService = {
    getStores: async (): Promise<StoreProfile[]> => {
        try {
            const snap = await db.collection("stores").get();
            return snap.docs.map(d => mapDoc(d) as StoreProfile);
        } catch (e) { return []; }
    },
    addStore: async (store: Omit<StoreProfile, 'id'>) => { await db.collection("stores").add(store); },
    deleteStore: async (id: string) => { await db.collection("stores").doc(id).delete(); }
};
