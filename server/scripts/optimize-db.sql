-- STAR RANKER PERFORMANCE INDEXING
-- Applied via manual script to bypass interactive CLI prompts

-- Items: most queried by categoryId + rank
CREATE INDEX IF NOT EXISTS "items_category_rank_idx" ON "items" ("category_slug", "rank");

-- Stakes: queried by userId + status constantly
CREATE INDEX IF NOT EXISTS "stakes_user_status_idx" ON "stakes" ("user_id", "status");

-- Stakes: queried by epochId for settlement
CREATE INDEX IF NOT EXISTS "stakes_epoch_idx" ON "stakes" ("epoch_id");

-- Votes: queried by itemId for momentum calculation
CREATE INDEX IF NOT EXISTS "votes_item_idx" ON "votes" ("item_doc_id");

-- Votes: queried by userId + date for quest tracking
CREATE INDEX IF NOT EXISTS "votes_user_updated_idx" ON "votes" ("user_id", "updated_at");

-- Notifications: queried by userId + read status constantly
CREATE INDEX IF NOT EXISTS "notif_user_read_idx" ON "notifications" ("user_id", "read");

-- Market comments: queried by itemId
CREATE INDEX IF NOT EXISTS "market_comments_item_idx" ON "market_comments" ("item_id");

-- Epoch snapshots: queried by epochId + itemId
CREATE INDEX IF NOT EXISTS "snapshot_epoch_item_idx" ON "epoch_snapshots" ("epoch_id", "item_id");

-- Price Alerts (Bonus)
CREATE INDEX IF NOT EXISTS "price_alerts_user_idx" ON "price_alerts" ("user_id");
CREATE INDEX IF NOT EXISTS "price_alerts_active_idx" ON "price_alerts" ("active");
