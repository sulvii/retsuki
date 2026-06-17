import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { Regions } from "../db/data/locations";

export const guilds = sqliteTable("guilds", {
  guildId: text("guild_id").primaryKey(),
  prefix: text("prefix").notNull().default("retsuki"),
});

export const users = sqliteTable("users", {
  userId: text("user_id").primaryKey(),
});

export const kingdoms = sqliteTable("kingdoms", {
  kingdomId: text("kingdom_id").primaryKey(),
  name: text("name").notNull(),
  revenue: real("revenue").notNull().default(0),
  lastDailyClaimed: integer("last_daily_claimed").notNull().default(0),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.userId, { onDelete: "cascade" }),
  region: integer("region")
    .notNull()
    .default(Regions.Valley),
  locations: text("locations").notNull().default("[]"),
});

export const usersRelations = relations(users, ({ one }) => ({
  kingdom: one(kingdoms, {
    fields: [users.userId],
    references: [kingdoms.userId],
  }),
}));

export const kingdomsRelations = relations(kingdoms, ({ one }) => ({
  user: one(users, {
    fields: [kingdoms.userId],
    references: [users.userId],
  }),
}));

export type Guild = typeof guilds.$inferSelect;
export type InsertGuild = typeof guilds.$inferInsert;

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Kingdom = typeof kingdoms.$inferSelect;
export type InsertKingdom = typeof kingdoms.$inferInsert;