-- Run this in Supabase SQL Editor if you already applied schema.sql
-- and need to enable Realtime on existing tables.

ALTER PUBLICATION supabase_realtime ADD TABLE cards;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE bids;
