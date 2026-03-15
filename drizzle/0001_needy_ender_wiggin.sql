CREATE TABLE "market_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"user_id" text,
	"item_doc_id" text,
	"item_name" text,
	"category_slug" text,
	"amount" real,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP INDEX "items_category_idx";--> statement-breakpoint
DROP INDEX "votes_user_category_idx";--> statement-breakpoint
DROP INDEX "votes_user_item_idx";--> statement-breakpoint
DROP INDEX "stakes_user_idx";--> statement-breakpoint
DROP INDEX "notifications_user_idx";--> statement-breakpoint
ALTER TABLE "stakes" ALTER COLUMN "target" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_moderator" boolean DEFAULT false;--> statement-breakpoint
CREATE INDEX "market_activity_type_idx" ON "market_activity" USING btree ("type");--> statement-breakpoint
CREATE INDEX "market_activity_created_idx" ON "market_activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "epoch_snapshots_epoch_idx" ON "epoch_snapshots" USING btree ("epoch_id");--> statement-breakpoint
CREATE INDEX "epoch_snapshots_item_idx" ON "epoch_snapshots" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "transactions_user_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_ref_idx" ON "transactions" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "items_category_idx" ON "items" USING btree ("category_slug");--> statement-breakpoint
CREATE INDEX "votes_user_category_idx" ON "votes" USING btree ("user_id","category_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "votes_user_item_idx" ON "votes" USING btree ("user_id","item_doc_id");--> statement-breakpoint
CREATE INDEX "stakes_user_idx" ON "stakes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");