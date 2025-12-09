
import firebase from 'firebase/compat/app';
import { auth as firebaseAuth, googleProvider, db } from './firebase';
import { Binder, BinderType, Card, CardCondition, ChatMessage, GameType, MatchResult, UserProfile } from '../types';

// CONVERSION UTILS
// Firestore returns data as objects; we need to attach the ID
const mapDoc = (doc: any) => ({ id: doc.id, ...doc.data() });

// AUTH SERVICE
let currentUserProfile: UserProfile | null = null;

export const auth = {
  login: async (): Promise<UserProfile> => {
    try {
      // Fix for "Operation not supported in this environment"
      // Explicitly sets persistence to LOCAL to ensure cookies/storage work correctly
      await firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

      const result = await firebaseAuth.signInWithPopup(googleProvider);
      const user = result.user;
      
      if (!user) throw new Error("Authentication failed");

      // Check if user exists in Firestore to pull custom fields (whatsapp, store)
      const userDoc = await db.collection("users").doc(user.uid).get();
      let customData = {};
      if (userDoc.exists) {
          customData = userDoc.data() || {};
      }

      const profile: UserProfile = {
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Unnamed Trader',
        photoURL: user.photoURL || undefined,
        isOnline: true,
        ...customData // Merge saved data like whatsapp/store
      };

      currentUserProfile = profile;
      return profile;
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  },
  loginAsGuest: async (): Promise<UserProfile> => {
      // MOCK LOGIN for testing in environments where Google Auth is blocked
      const guestId = 'guest_user_' + Math.floor(Math.random() * 1000);
      const guestProfile: UserProfile = {
          id: guestId,
          email: 'guest@lotus.test',
          displayName: 'Guest Trader',
          photoURL: undefined,
          isOnline: true
      };
      console.log("Logged in as Guest:", guestProfile);
      currentUserProfile = guestProfile;
      return guestProfile;
  },
  getCurrentUser: () => {
    if (currentUserProfile) return currentUserProfile;
    // Fallback if page refreshed (simplified for this stage)
    const fUser = firebaseAuth.currentUser;
    if (fUser) {
        return {
            id: fUser.uid,
            email: fUser.email || '',
            displayName: fUser.displayName || 'Trader',
            photoURL: fUser.photoURL || undefined
        };
    }
    return null;
  },
  updateProfile: async (updates: Partial<UserProfile>): Promise<void> => {
      const user = firebaseAuth.currentUser;
      const current = currentUserProfile;
      
      if (!user || !current) throw new Error("No user logged in");

      try {
          // 1. Update Firebase Auth (Display Name / Photo)
          if (updates.displayName || updates.photoURL) {
              await user.updateProfile({
                  displayName: updates.displayName || user.displayName,
                  photoURL: updates.photoURL || user.photoURL
              });
          }

          // 2. Update Firestore "users" collection (Custom fields: whatsapp, store)
          // We use set with merge: true to create the doc if it doesn't exist
          const firestoreUpdates = {
              displayName: updates.displayName || current.displayName,
              email: current.email,
              whatsapp: updates.whatsapp || null,
              preferredStore: updates.preferredStore || null,
              updatedAt: Date.now()
          };
          
          await db.collection("users").doc(user.uid).set(firestoreUpdates, { merge: true });

          // 3. Update local state
          currentUserProfile = { ...current, ...updates };

      } catch (error) {
          console.error("Error updating profile:", error);
          throw error;
      }
  },
  logout: async () => {
      await firebaseAuth.signOut();
      currentUserProfile = null;
  }
};

// BINDER SERVICE
export const binderService = {
  getUserBinders: async (userId: string): Promise<Binder[]> => {
    try {
        const snapshot = await db.collection("binders").where("userId", "==", userId).get();
        return snapshot.docs.map(doc => mapDoc(doc) as Binder);
    } catch (e) {
        console.error("Error fetching binders", e);
        return [];
    }
  },

  createBinder: async (binderData: Omit<Binder, 'id' | 'createdAt' | 'cardCount'>): Promise<Binder> => {
    try {
        console.log("Creating binder...", binderData);
        const newBinder = {
          ...binderData,
          createdAt: Date.now(),
          cardCount: 0
        };
        const docRef = await db.collection("binders").add(newBinder);
        console.log("Binder created with ID:", docRef.id);
        return { id: docRef.id, ...newBinder } as Binder;
    } catch (e) {
        console.error("Detailed Create Binder Error:", e);
        throw e;
    }
  },

  deleteBinder: async (binderId: string) => {
    // 1. Delete the binder document
    await db.collection("binders").doc(binderId).delete();

    // 2. Delete all cards in that binder (Batch delete)
    const snapshot = await db.collection("cards").where("binderId", "==", binderId).get();
    
    const batch = db.batch();
    snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
    });
    await batch.commit();
  }
};

// CARD SERVICE
export const cardService = {
  getCardsInBinder: async (binderId: string): Promise<Card[]> => {
    const snapshot = await db.collection("cards").where("binderId", "==", binderId).get();
    return snapshot.docs.map(doc => mapDoc(doc) as Card);
  },

  addCard: async (cardData: Omit<Card, 'id' | 'addedAt'>): Promise<Card> => {
    const newCard = {
      ...cardData,
      addedAt: Date.now()
    };
    
    // Save card
    const docRef = await db.collection("cards").add(newCard);
    
    // Update binder count using atomic increment
    await db.collection("binders").doc(cardData.binderId).update({
        cardCount: firebase.firestore.FieldValue.increment(1)
    });
    
    return { id: docRef.id, ...newCard } as Card;
  },

  removeCard: async (cardId: string) => {
    const cardRef = db.collection("cards").doc(cardId);
    const cardSnap = await cardRef.get();

    if (!cardSnap.exists) return;
    
    const cardData = cardSnap.data();

    // Delete card
    await cardRef.delete();

    // Decrement binder count
    if (cardData && cardData.binderId) {
        await db.collection("binders").doc(cardData.binderId).update({
            cardCount: firebase.firestore.FieldValue.increment(-1)
        });
    }
  }
};

// MATCHING SERVICE (The Core Feature)
export const matchingService = {
  findMatches: async (currentUserId: string): Promise<MatchResult[]> => {
    // 1. Get MY Wishlist Binders
    const myBinderSnap = await db.collection("binders")
        .where("userId", "==", currentUserId)
        .where("type", "==", BinderType.WISHLIST)
        .get();
        
    const myBinderIds = myBinderSnap.docs.map(d => d.id);

    if (myBinderIds.length === 0) return [];

    // 2. Get MY Wishlist Cards
    // Firestore "in" query allows max 10 items. If > 10 binders, this breaks.
    // For MVP, we fetch cards one binder at a time or fetch all cards for user.
    // Let's fetch all cards for the user and filter in memory for simplicity.
    const myCardsSnap = await db.collection("cards").where("userId", "==", currentUserId).get();
    const allMyCards = myCardsSnap.docs.map(d => mapDoc(d) as Card);
    
    const myWants = allMyCards.filter(c => myBinderIds.includes(c.binderId));
    
    if (myWants.length === 0) return [];

    // 3. Find matching cards in the GLOBAL market
    // Strategy: We want cards where (userId != me) AND (name IN [myWants.names])
    // Firestore cannot do "!= me" easily combined with other filters.
    // We will query for cards by Name.
    
    const matches: MatchResult[] = [];
    
    // To optimize, we loop through myWants unique names
    const uniqueWantNames = [...new Set(myWants.map(w => w.name))];
    
    // Batch queries (limit to 10 for 'in' operator)
    // For MVP, we will query specifically for the first 10 wanted cards
    const namesToSearch = uniqueWantNames.slice(0, 10); 
    
    if (namesToSearch.length > 0) {
        const marketSnap = await db.collection("cards")
            .where("name", "in", namesToSearch)
            .get();

        const candidates = marketSnap.docs.map(d => mapDoc(d) as Card);

        // 4. Filter candidates
        for (const candidate of candidates) {
            if (candidate.userId === currentUserId) continue; // Skip my own cards

            // Check if this card belongs to a "FOR_TRADE" binder
            // We need to fetch the binder info. 
            // NOTE: In a production app, we should store "binderType" on the card object 
            // to avoid this extra read!
            // Let's assume for MVP we check the binder now.
            
            // Optimization: We could fetch all binders for this user, but let's do one-by-one for safety
            // or modify the Card model to include 'binderType'.
            
            // Let's rely on client-side filtering for the match
            const wantCard = myWants.find(w => w.name === candidate.name);
            if (wantCard) {
                // Fetch seller profile 
                let sellerProfile: UserProfile = {
                    id: candidate.userId,
                    displayName: 'Remote User', 
                    email: '',
                    isOnline: false
                };

                try {
                    const userDoc = await db.collection("users").doc(candidate.userId).get();
                    if (userDoc.exists) {
                        sellerProfile = { ...sellerProfile, ...userDoc.data() };
                    }
                } catch (e) {
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
    // For MVP, we won't implement real-time Firestore chat yet
    // because it requires setting up listeners.
    getMessages: async (userId: string): Promise<ChatMessage[]> => {
        return [];
    },
    sendMessage: async (senderId: string, receiverId: string, content: string) => {
        return {} as ChatMessage;
    }
};
