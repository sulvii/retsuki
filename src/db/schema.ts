import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { Regions } from "../db/data/locations";
import { CitizenRoles } from "../db/data/roles";

export const guilds = sqliteTable("guilds", {
	guildId: text("guild_id").primaryKey(),
	prefix: text("prefix").notNull().default("retsuki"),
	disabledPrefixes: text("prefix").default("[]"),
});

export const users = sqliteTable("users", {
	userId: text("user_id").primaryKey(),
});

export const kingdoms = sqliteTable("kingdoms", {
	kingdomId: text("kingdom_id").primaryKey(),
	name: text("name").notNull(),
	revenue: real("revenue").notNull().default(0),
	lastDailyClaimed: integer("last_daily_claimed").notNull().default(0),
	lastBattleAt: integer("last_battle_at").notNull().default(0),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => users.userId, { onDelete: "cascade" }),
	region: integer("region").notNull().default(Regions.Valley),
	locations: text("locations").notNull().default("[]"),
});

export const citizens = sqliteTable("citizens", {
	citizenId: text("citizen_id").primaryKey(),
	role: integer("role").notNull().default(CitizenRoles.Miner),
	kingdomId: text("kingdom_id")
		.notNull()
		.references(() => kingdoms.kingdomId, { onDelete: "cascade" }),
});

export const resources = sqliteTable("resources", {
	resourceId: text("resource_id").primaryKey(),
	kingdomId: text("kingdom_id")
		.notNull()
		.references(() => kingdoms.kingdomId, { onDelete: "cascade" }),
	item: text("item").notNull(),
	rarity: text("rarity").notNull(),
	sellWorthEach: real("sell_worth_each").notNull(),
	quantity: integer("quantity").notNull().default(0),
	totalSold: integer("total_sold").notNull().default(0),
});

export const armory = sqliteTable("armory", {
	kingdomId: text("kingdom_id")
		.primaryKey()
		.references(() => kingdoms.kingdomId, { onDelete: "cascade" }),
	warriorTier: integer("warrior_tier").notNull().default(0),
	archerTier: integer("archer_tier").notNull().default(0),
	knightTier: integer("knight_tier").notNull().default(0),
});

export const battles = sqliteTable("battles", {
	battleId: text("battle_id").primaryKey(),
	challengerId: text("challenger_id").notNull(),
	defenderId: text("defender_id").notNull(),
	status: text("status").notNull().default("pending"), // pending | deploying | resolved | declined
	channelId: text("channel_id").notNull(),
	challengerAllocation: text("challenger_allocation"), // JSON string
	defenderAllocation: text("defender_allocation"), // JSON string
	winnerId: text("winner_id"),
	createdAt: integer("created_at").notNull(),
	resolvedAt: integer("resolved_at"),
});

export const armoryRelations = relations(armory, ({ one }) => ({
	kingdom: one(kingdoms, {
		fields: [armory.kingdomId],
		references: [kingdoms.kingdomId],
	}),
}));

export const usersRelations = relations(users, ({ one }) => ({
	kingdom: one(kingdoms, {
		fields: [users.userId],
		references: [kingdoms.userId],
	}),
}));

export const kingdomsRelations = relations(kingdoms, ({ one, many }) => ({
	user: one(users, {
		fields: [kingdoms.userId],
		references: [users.userId],
	}),
	citizens: many(citizens),
	resources: many(resources),
}));

export const citizensRelations = relations(citizens, ({ one }) => ({
	kingdom: one(kingdoms, {
		fields: [citizens.kingdomId],
		references: [kingdoms.kingdomId],
	}),
}));

export const resourcesRelations = relations(resources, ({ one }) => ({
	kingdom: one(kingdoms, {
		fields: [resources.kingdomId],
		references: [kingdoms.kingdomId],
	}),
}));

export type Guild = typeof guilds.$inferSelect;
export type InsertGuild = typeof guilds.$inferInsert;

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Kingdom = typeof kingdoms.$inferSelect;
export type InsertKingdom = typeof kingdoms.$inferInsert;

export type Citizen = typeof citizens.$inferSelect;
export type InsertCitizen = typeof citizens.$inferInsert;

export type Resource = typeof resources.$inferSelect;
export type InsertResource = typeof resources.$inferInsert;

export type Armory = typeof armory.$inferSelect;
export type InsertArmory = typeof armory.$inferInsert;

export type Battle = typeof battles.$inferSelect;
export type InsertBattle = typeof battles.$inferInsert;
