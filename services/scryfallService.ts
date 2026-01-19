
import { ScryfallCard } from '../types';
import { db } from './firebase';

const BASE_URL = 'https://api.scryfall.com';
const CACHE_COLLECTION = 'cards_library';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 Days in milliseconds

/**
 * Helper to save a card to our global Firestore library
 */
const upsertToLibrary = async (card: ScryfallCard) => {
    try {
        await db.collection(CACHE_COLLECTION).doc(card.id).set({
            ...card,
            last_updated: Date.now()
        }, { merge: true });
    } catch (e) {
        // Silently fail to not clutter logs
    }
};

/**
 * Helper to get a card from our global Firestore library
 */
const getFromLibrary = async (id: string): Promise<ScryfallCard | null> => {
    try {
        const doc = await db.collection(CACHE_COLLECTION).doc(id).get();
        if (doc.exists) {
            return doc.data() as ScryfallCard;
        }
    } catch (e) {
        console.warn("Failed to fetch from library", e);
    }
    return null;
};

/**
 * Improved Local search fallback. 
 */
const searchLocalLibrary = async (query: string): Promise<ScryfallCard[]> => {
    try {
        if (!query) return [];
        
        const lowerQuery = query.toLowerCase();
        const capitalizedQuery = query.charAt(0).toUpperCase() + query.slice(1).toLowerCase();
        
        const [snapLower, snapCap] = await Promise.all([
            db.collection(CACHE_COLLECTION)
                .where('name', '>=', lowerQuery)
                .where('name', '<=', lowerQuery + '\uf8ff')
                .limit(10)
                .get(),
            db.collection(CACHE_COLLECTION)
                .where('name', '>=', capitalizedQuery)
                .where('name', '<=', capitalizedQuery + '\uf8ff')
                .limit(10)
                .get()
        ]);
        
        const results = [...snapLower.docs, ...snapCap.docs].map(doc => doc.data() as ScryfallCard);
        const uniqueMap = new Map<string, ScryfallCard>();
        results.forEach(card => uniqueMap.set(card.id, card));
        
        return Array.from(uniqueMap.values());
    } catch (e) {
        console.warn("Local library search failed", e);
        return [];
    }
};

export const searchCards = async (query: string): Promise<ScryfallCard[]> => {
  if (!query || query.length < 3) return [];
  
  try {
    const response = await fetch(`${BASE_URL}/cards/search?q=${encodeURIComponent(query)}`, {
        headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
        if (response.status === 404) return await searchLocalLibrary(query);
        return await searchLocalLibrary(query);
    }
    
    const data = await response.json();
    const results: ScryfallCard[] = data.data || [];
    results.slice(0, 10).forEach(card => upsertToLibrary(card));
    return results;
  } catch (error) {
    console.warn("Scryfall search currently unreachable. Using Lotus Library fallback.");
    return await searchLocalLibrary(query);
  }
};

export const getCardPrintings = async (oracleId: string): Promise<ScryfallCard[]> => {
    if (!oracleId) return [];
    try {
        const response = await fetch(`${BASE_URL}/cards/search?q=oracle_id:${oracleId}&unique=prints&order=released&dir=desc`, {
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            const local = await db.collection(CACHE_COLLECTION).where('oracle_id', '==', oracleId).get();
            return local.docs.map(d => d.data() as ScryfallCard);
        }
        const data = await response.json();
        const results: ScryfallCard[] = data.data || [];
        results.forEach(card => upsertToLibrary(card));
        return results;
    } catch (error) {
        console.warn("Scryfall versions unreachable, checking local library.");
        const local = await db.collection(CACHE_COLLECTION).where('oracle_id', '==', oracleId).get();
        return local.docs.map(d => d.data() as ScryfallCard);
    }
}

/**
 * Fetches a single card by ID, checking the Lotus Library first.
 */
export const getCardById = async (id: string): Promise<ScryfallCard | null> => {
    const cached = await getFromLibrary(id);
    const now = Date.now();

    if (cached && cached.last_updated && (now - (cached.last_updated as any)) < CACHE_TTL) {
        return cached;
    }

    try {
        const response = await fetch(`${BASE_URL}/cards/${id}`, {
            headers: { 'Accept': 'application/json' }
        });
        if (response.ok) {
            const card = await response.json();
            upsertToLibrary(card);
            return card;
        }
    } catch (e) {
        console.warn("Network error fetching card by ID. Using cached version.");
    }

    return cached;
};

/**
 * Audit prices for a list of card IDs. 
 * If a card in the library is stale, it refreshes it from Scryfall.
 */
export const auditAndRefreshPrices = async (ids: string[]): Promise<Record<string, number>> => {
    const freshPrices: Record<string, number> = {};
    const now = Date.now();

    for (const id of ids) {
        try {
            const cached = await getFromLibrary(id);
            let latestCard = cached;

            // If missing or older than 7 days, fetch from Scryfall
            if (!cached || !cached.last_updated || (now - (cached.last_updated as any)) > CACHE_TTL) {
                const response = await fetch(`${BASE_URL}/cards/${id}`, {
                    headers: { 'Accept': 'application/json' }
                });
                if (response.ok) {
                    latestCard = await response.json();
                    if (latestCard) await upsertToLibrary(latestCard);
                }
            }

            if (latestCard) {
                // Determine base price (non-foil first, fallback to foil)
                const price = latestCard.prices.usd ? parseFloat(latestCard.prices.usd) : (latestCard.prices.usd_foil ? parseFloat(latestCard.prices.usd_foil) : 0);
                freshPrices[id] = price;
            }
        } catch (e) {
            console.warn(`Failed to audit price for card ${id}`, e);
        }
    }
    return freshPrices;
};

export const getCardImage = (card: ScryfallCard): string => {
  if (card.image_uris?.normal) return card.image_uris.normal;
  if (card.card_faces?.[0]?.image_uris?.normal) return card.card_faces[0].image_uris.normal;
  return 'https://via.placeholder.com/300x420?text=No+Image';
};

export interface CSVParseResult {
  headers: string[];
  rows: Record<string, string>[];
}

export const parseCSV = async (file: File): Promise<CSVParseResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
        
        if (lines.length < 1) {
          resolve({ headers: [], rows: [] });
          return;
        }
        
        const parseLine = (line: string) => {
            const result = [];
            let start = 0;
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                if (line[i] === '"') {
                    inQuotes = !inQuotes;
                } else if (line[i] === ',' && !inQuotes) {
                    result.push(line.substring(start, i).trim().replace(/^"|"$/g, ''));
                    start = i + 1;
                }
            }
            result.push(line.substring(start).trim().replace(/^"|"$/g, ''));
            return result;
        };

        const headers = parseLine(lines[0]);
        const rows = lines.slice(1).map(line => {
            const values = parseLine(line);
            const rowObj: Record<string, string> = {};
            headers.forEach((h, i) => {
                rowObj[h] = values[i] || '';
            });
            return rowObj;
        });
        
        resolve({ headers, rows });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};
