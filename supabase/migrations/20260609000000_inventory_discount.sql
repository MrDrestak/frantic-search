-- Inventory discount prompt for post-feedback workflow
-- Adds card_id, binder_id, and inventory_updated to trade_interactions

ALTER TABLE trade_interactions
  ADD COLUMN card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
  ADD COLUMN binder_id UUID REFERENCES binders(id) ON DELETE SET NULL,
  ADD COLUMN inventory_updated BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_trade_inventory_pending ON trade_interactions(seller_id, inventory_updated)
  WHERE inventory_updated = FALSE;
