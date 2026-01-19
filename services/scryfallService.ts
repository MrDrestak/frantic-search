
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
        console.warn("Failed to cache card in library", e);
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

export const searchCards = async (query: string): Promise<ScryfallCard[]> => {
  if (!query || query.length < 3) return [];
  
  try {
    // We always use Scryfall for searching text to leverage their powerful search engine
    const response = await fetch(`${BASE_URL}/cards/search?q=${encodeURIComponent(query)}`);

    if (!response.ok) {
        console.warn(`Scryfall API error: ${response.status} ${response.statusText}`);
        return [];
    }
    
    const data = await response.json();
    const results: ScryfallCard[] = data.data || [];

    // Organic growth: Save results to library in the background
    // (We don't await this to keep the search snappy)
    results.slice(0, 10).forEach(card => upsertToLibrary(card));

    return results;
  } catch (error) {
    console.error("Scryfall search error:", error);
    return [];
  }
};

export const getCardPrintings = async (oracleId: string): Promise<ScryfallCard[]> => {
    if (!oracleId) return [];
    try {
        // We still fetch the list from Scryfall to ensure we see new editions
        const response = await fetch(`${BASE_URL}/cards/search?q=oracle_id:${oracleId}&unique=prints&order=released&dir=desc`);

        if (!response.ok) {
            console.warn(`Scryfall versions error: ${response.status} ${response.statusText}`);
            return [];
        }
        const data = await response.json();
        const results: ScryfallCard[] = data.data || [];

        // Cache all versions found
        results.forEach(card => upsertToLibrary(card));

        return results;
    } catch (error) {
        console.error("Scryfall versions error:", error);
        return [];
    }
}

/**
 * Fetches a single card by ID, checking the Lotus Library first.
 */
export const getCardById = async (id: string): Promise<ScryfallCard | null> => {
    // 1. Check Library
    const cached = await getFromLibrary(id);
    const now = Date.now();

    // 2. If valid cache (less than 7 days old), return it
    if (cached && cached.last_updated && (now - (cached.last_updated as any)) < CACHE_TTL) {
        return cached;
    }

    // 3. Otherwise (or if stale), fetch from Scryfall
    try {
        const response = await fetch(`${BASE_URL}/cards/${id}`);
        if (response.ok) {
            const card = await response.json();
            // Update library
            await upsertToLibrary(card);
            return card;
        }
    } catch (e) {
        console.error("Error fetching specific card", e);
    }

    // 4. Fallback to stale cache if Scryfall is down
    return cached;
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
        
        // Basic CSV parsing handling quoted values
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
