// Scryfall API — client-side, no server required.
// Firestore caching removed; Supabase prices table (populated by CK sync) covers price data.

const BASE_URL = 'https://api.scryfall.com';

export interface ScryfallCard {
    id: string;
    oracle_id?: string;
    name: string;
    set_name: string;
    collector_number: string;
    rarity: string;
    image_uris?: { normal: string; small: string; large: string };
    card_faces?: Array<{ image_uris?: { normal: string; small: string; large: string } }>;
    prices: { usd?: string | null; usd_foil?: string | null };
    [key: string]: unknown;
}

export interface CSVParseResult {
    headers: string[];
    rows: Record<string, string>[];
}

export async function searchCards(query: string): Promise<ScryfallCard[]> {
    if (!query || query.length < 3) return [];
    try {
        const res = await fetch(`${BASE_URL}/cards/search?q=${encodeURIComponent(query)}`, {
            headers: { Accept: 'application/json' },
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data.data ?? [];
    } catch {
        return [];
    }
}

export async function getCardPrintings(oracleId: string): Promise<ScryfallCard[]> {
    if (!oracleId) return [];
    try {
        const res = await fetch(
            `${BASE_URL}/cards/search?q=oracle_id:${oracleId}&unique=prints&order=released&dir=desc`,
            { headers: { Accept: 'application/json' } }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return data.data ?? [];
    } catch {
        return [];
    }
}

export async function getCardById(id: string): Promise<ScryfallCard | null> {
    try {
        const res = await fetch(`${BASE_URL}/cards/${id}`, { headers: { Accept: 'application/json' } });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

export function getCardImage(card: ScryfallCard): string {
    if (card.image_uris?.normal) return card.image_uris.normal;
    if (card.card_faces?.[0]?.image_uris?.normal) return card.card_faces[0].image_uris.normal;
    return 'https://placehold.co/300x420?text=No+Image';
}

export function parseCSV(file: File): Promise<CSVParseResult> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split(/\r\n|\n/).filter((l) => l.trim());
                if (!lines.length) { resolve({ headers: [], rows: [] }); return; }

                const parseLine = (line: string) => {
                    const result: string[] = [];
                    let start = 0; let inQuotes = false;
                    for (let i = 0; i < line.length; i++) {
                        if (line[i] === '"') { inQuotes = !inQuotes; }
                        else if (line[i] === ',' && !inQuotes) {
                            result.push(line.slice(start, i).trim().replace(/^"|"$/g, ''));
                            start = i + 1;
                        }
                    }
                    result.push(line.slice(start).trim().replace(/^"|"$/g, ''));
                    return result;
                };

                const headers = parseLine(lines[0]);
                const rows = lines.slice(1).map((line) => {
                    const vals = parseLine(line);
                    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
                });
                resolve({ headers, rows });
            } catch (err) { reject(err); }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}
