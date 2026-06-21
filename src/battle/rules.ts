import { and, desc, eq, or } from "drizzle-orm";
import { db } from "../db/db";
import { battles } from "../db/schema";
import type { Kingdom } from "../db/schema";

export const MIN_TREASURY_TO_BATTLE = 1500;
export const WAR_FATIGUE_MS = 6 * 60 * 60 * 1000;
export const SAME_TARGET_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function formatDuration(ms: number): string {
	const hours = Math.floor(ms / (1000 * 60 * 60));
	const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
	return `${hours}h ${minutes}m`;
}

export function checkWarFatigue(kingdom: Kingdom): string | null {
	const elapsed = Date.now() - kingdom.lastBattleAt;
	if (elapsed < WAR_FATIGUE_MS) return formatDuration(WAR_FATIGUE_MS - elapsed);
	return null;
}

export function hasActiveBattle(userId: string): boolean {
	const active = db
		.select()
		.from(battles)
		.where(
			and(
				or(eq(battles.challengerId, userId), eq(battles.defenderId, userId)),
				or(eq(battles.status, "pending"), eq(battles.status, "deploying")),
			),
		)
		.get();
	return !!active;
}

export function getLastResolvedBattleBetween(userA: string, userB: string) {
	return db
		.select()
		.from(battles)
		.where(
			and(
				eq(battles.status, "resolved"),
				or(
					and(eq(battles.challengerId, userA), eq(battles.defenderId, userB)),
					and(eq(battles.challengerId, userB), eq(battles.defenderId, userA)),
				),
			),
		)
		.orderBy(desc(battles.resolvedAt))
		.get();
}
