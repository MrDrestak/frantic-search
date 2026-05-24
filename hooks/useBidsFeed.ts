'use client';

import { useEffect, useState } from 'react';
import { auctionService } from '@/services/store';
import type { Bid } from '@/types';

export function useBidsFeed(cardId: string) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  // Load bid history on mount.
  useEffect(() => {
    if (!cardId) return;
    auctionService
      .getBidHistory(cardId)
      .then(setBids)
      .finally(() => setLoading(false));
  }, [cardId]);

  // Prepend new bids in real time.
  useEffect(() => {
    if (!cardId) return;

    const channel = auctionService.subscribeToBids(cardId, (bid) => {
      setBids((prev) => [bid, ...prev]);
    });

    return () => { channel.unsubscribe(); };
  }, [cardId]);

  return { bids, loading };
}
