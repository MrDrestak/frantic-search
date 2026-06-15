
import { ScryfallCard } from '../types';

const BASE_URL = 'https://api.scryfall.com';

export const searchCards = async (query: string): Promise<ScryfallCard[]> => {
  if (!query || query.length < 3) return [];
  try {
    const response = await fetch(`${BASE_URL}/cards/search?q=${encodeURIComponent(query)}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.data || [];
  } catch {
    console.warn("Scryfall search unreachable.");
    return [];
  }
};

export const getCardPrintings = async (oracleId: string): Promise<ScryfallCard[]> => {
  if (!oracleId) return [];
  try {
    const response = await fetch(
      `${BASE_URL}/cards/search?q=oracle_id:${oracleId}&unique=prints&order=released&dir=desc`,
      { headers: { 'Accept': 'application/json' } },
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.data || [];
  } catch {
    console.warn("Scryfall versions unreachable.");
    return [];
  }
};

export const getCardById = async (id: string): Promise<ScryfallCard | null> => {
  try {
    const response = await fetch(`${BASE_URL}/cards/${id}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (response.ok) return await response.json();
  } catch {
    console.warn("Network error fetching card by ID.");
  }
  return null;
};

export const auditAndRefreshPrices = async (ids: string[]): Promise<Record<string, number>> => {
  const freshPrices: Record<string, number> = {};
  for (const id of ids) {
    try {
      const response = await fetch(`${BASE_URL}/cards/${id}`, {
        headers: { 'Accept': 'application/json' },
      });
      if (response.ok) {
        const card: ScryfallCard = await response.json();
        const price = card.prices.usd
          ? parseFloat(card.prices.usd)
          : card.prices.usd_foil
            ? parseFloat(card.prices.usd_foil)
            : 0;
        freshPrices[id] = price;
      }
    } catch {
      console.warn(`Failed to audit price for card ${id}`);
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
          headers.forEach((h, i) => { rowObj[h] = values[i] || ''; });
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
