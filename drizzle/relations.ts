import { relations } from "drizzle-orm/relations";
import { items, marketComments, oracleBattles, categories, oracleTrials, trialAttempts, seasons, seasonLeaderboard } from "./schema";

export const marketCommentsRelations = relations(marketComments, ({one}) => ({
	item: one(items, {
		fields: [marketComments.itemId],
		references: [items.id]
	}),
}));

export const itemsRelations = relations(items, ({many}) => ({
	marketComments: many(marketComments),
	oracleBattles_itemAId: many(oracleBattles, {
		relationName: "oracleBattles_itemAId_items_id"
	}),
	oracleBattles_itemBId: many(oracleBattles, {
		relationName: "oracleBattles_itemBId_items_id"
	}),
}));

export const oracleBattlesRelations = relations(oracleBattles, ({one}) => ({
	item_itemAId: one(items, {
		fields: [oracleBattles.itemAId],
		references: [items.id],
		relationName: "oracleBattles_itemAId_items_id"
	}),
	item_itemBId: one(items, {
		fields: [oracleBattles.itemBId],
		references: [items.id],
		relationName: "oracleBattles_itemBId_items_id"
	}),
	category: one(categories, {
		fields: [oracleBattles.categoryId],
		references: [categories.id]
	}),
}));

export const categoriesRelations = relations(categories, ({many}) => ({
	oracleBattles: many(oracleBattles),
	oracleTrials: many(oracleTrials),
}));

export const oracleTrialsRelations = relations(oracleTrials, ({one, many}) => ({
	category: one(categories, {
		fields: [oracleTrials.categoryId],
		references: [categories.id]
	}),
	trialAttempts: many(trialAttempts),
}));

export const trialAttemptsRelations = relations(trialAttempts, ({one}) => ({
	oracleTrial: one(oracleTrials, {
		fields: [trialAttempts.trialId],
		references: [oracleTrials.id]
	}),
}));

export const seasonLeaderboardRelations = relations(seasonLeaderboard, ({one}) => ({
	season: one(seasons, {
		fields: [seasonLeaderboard.seasonId],
		references: [seasons.id]
	}),
}));

export const seasonsRelations = relations(seasons, ({many}) => ({
	seasonLeaderboards: many(seasonLeaderboard),
}));