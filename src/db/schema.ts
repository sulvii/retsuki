import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const guilds = sqliteTable("guilds", {
  guildId: text("guild_id").primaryKey(),
  prefix:  text("prefix").notNull().default("retsuki"),
});

export type Guild        = typeof guilds.$inferSelect;
export type InsertGuild  = typeof guilds.$inferInsert;