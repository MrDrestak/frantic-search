
// Firestore-compatible shim — routes queries to Supabase.
// Views import { db } from '../services/firebase' without changes.
import { supabase } from './supabase';

const FIELD_MAP: Record<string, string> = {
  userId: 'user_id',
  binderType: 'binder_type',
  auctionStatus: 'auction_status',
  topBidderId: 'top_bidder_id',
  winnerId: 'winner_id',
  displayName: 'display_name',
};

const BINDER_TYPE_TO_DB: Record<string, string> = {
  'Auction': 'AUCTION',
  'Wishlist': 'WISHLIST',
  'For Trade/Sell': 'FOR_TRADE',
  'Personal Collection': 'COLLECTION',
};

function toSnakeField(field: string): string {
  return FIELD_MAP[field] ?? field;
}

function toDbValue(value: any): any {
  if (typeof value === 'string' && BINDER_TYPE_TO_DB[value]) return BINDER_TYPE_TO_DB[value];
  return value;
}

function rowToCamel(row: any): any {
  return {
    ...row,
    userId: row.user_id,
    binderType: row.binder_type,
    auctionStatus: row.auction_status,
    topBidderId: row.top_bidder_id,
    winnerId: row.winner_id,
    displayName: row.display_name,
    imageUrl: row.image_url,
    setName: row.set_name,
    collectorNumber: row.collector_number,
    isFoil: row.is_foil,
    customPrice: row.custom_price,
    purchaseUrl: row.purchase_url,
    addedAt: row.added_at ? new Date(row.added_at).getTime() : Date.now(),
    basePrice: row.base_price,
    buyItNowPrice: row.buy_it_now_price,
    currentBid: row.current_bid,
  };
}

class DocRef {
  constructor(private table: string, private id: string) {}

  async get() {
    const { data } = await supabase.from(this.table).select('*').eq('id', this.id).single();
    return {
      exists: !!data,
      data: () => (data ? rowToCamel(data) : null),
    };
  }
}

class CollectionRef {
  private filters: Array<{ field: string; value: any }> = [];

  constructor(private table: string) {}

  where(field: string, _op: string, value: any): this {
    this.filters.push({ field: toSnakeField(field), value: toDbValue(value) });
    return this;
  }

  doc(id: string): DocRef {
    return new DocRef(this.table, id);
  }

  async get() {
    let query = supabase.from(this.table).select('*') as any;
    for (const f of this.filters) {
      query = query.eq(f.field, f.value);
    }
    const { data } = await query;
    return {
      docs: (data || []).map((row: any) => ({
        id: row.id,
        data: () => rowToCamel(row),
      })),
      empty: !data || data.length === 0,
    };
  }
}

export const db: any = {
  collection: (name: string) => new CollectionRef(name),
};

export const auth: any = {};
export const googleProvider: any = {};
export default {} as any;
