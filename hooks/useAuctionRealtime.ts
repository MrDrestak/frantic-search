'use client';

import { useEffect, useState } from 'react';
import { auctionService } from '@/services/store';
import type { AuctionStatus } from '@/types';

interface AuctionState {
  current_bid: number | null;
  top_bidder_id: string | null;
  auction_end_date: string | null;
  bid_count: number;
  auction_status: AuctionStatus | null;
}

export function useAuctionRealtime(cardId: string, initial: Partial<AuctionState> = {}) {
  const [state, setState] = useState<AuctionState>({
    current_bid: initial.current_bid ?? null,
    top_bidder_id: initial.top_bidder_id ?? null,
    auction_end_date: initial.auction_end_date ?? null,
    bid_count: initial.bid_count ?? 0,
    auction_status: initial.auction_status ?? null,
  });

  useEffect(() => {
    if (!cardId) return;

    const channel = auctionService.subscribeToAuction(cardId, (card) => {
      setState((prev) => ({
        current_bid: card.current_bid !== undefined ? card.current_bid : prev.current_bid,
        top_bidder_id: card.top_bidder_id !== undefined ? card.top_bidder_id : prev.top_bidder_id,
        auction_end_date: card.auction_end_date !== undefined ? card.auction_end_date : prev.auction_end_date,
        bid_count: card.bid_count !== undefined ? card.bid_count : prev.bid_count,
        auction_status: card.auction_status !== undefined ? card.auction_status : prev.auction_status,
      }));
    });

    return () => { channel.unsubscribe(); };
  }, [cardId]);

  return state;
}
