import { CitizenRoles } from "../db/data/roles";

export type CombatRole =
	| CitizenRoles.Warrior
	| CitizenRoles.Archer
	| CitizenRoles.Knight;

export const COMBAT_ROLES: CombatRole[] = [
	CitizenRoles.Warrior,
	CitizenRoles.Archer,
	CitizenRoles.Knight,
];

export const FRONTS = ["vanguard", "flank", "rearguard"] as const;
export type Front = (typeof FRONTS)[number];

export type FrontAllocation = Record<CombatRole, number>;
export type Allocation = Record<Front, FrontAllocation>;

export interface ArmoryTiers {
	warriorTier: number;
	archerTier: number;
	knightTier: number;
}

const BASE_POWER: Record<CombatRole, number> = {
	[CitizenRoles.Warrior]: 10,
	[CitizenRoles.Archer]: 10,
	[CitizenRoles.Knight]: 12,
};

const COUNTERS: Record<CombatRole, CombatRole> = {
	[CitizenRoles.Warrior]: CitizenRoles.Archer,
	[CitizenRoles.Archer]: CitizenRoles.Knight,
	[CitizenRoles.Knight]: CitizenRoles.Warrior,
};

const WEAPON_BONUS_PER_TIER = 4;
const COUNTER_BONUS = 1.25;

function tierBonus(role: CombatRole, armory: ArmoryTiers): number {
	switch (role) {
		case CitizenRoles.Warrior:
			return armory.warriorTier * WEAPON_BONUS_PER_TIER;
		case CitizenRoles.Archer:
			return armory.archerTier * WEAPON_BONUS_PER_TIER;
		case CitizenRoles.Knight:
			return armory.knightTier * WEAPON_BONUS_PER_TIER;
	}
}

function frontPower(
	alloc: FrontAllocation,
	armory: ArmoryTiers,
): { power: number; dominant: CombatRole | null } {
	const powers: Record<CombatRole, number> = {
		[CitizenRoles.Warrior]:
			alloc[CitizenRoles.Warrior] *
			(BASE_POWER[CitizenRoles.Warrior] +
				tierBonus(CitizenRoles.Warrior, armory)),
		[CitizenRoles.Archer]:
			alloc[CitizenRoles.Archer] *
			(BASE_POWER[CitizenRoles.Archer] +
				tierBonus(CitizenRoles.Archer, armory)),
		[CitizenRoles.Knight]:
			alloc[CitizenRoles.Knight] *
			(BASE_POWER[CitizenRoles.Knight] +
				tierBonus(CitizenRoles.Knight, armory)),
	};

	const total =
		powers[CitizenRoles.Warrior] +
		powers[CitizenRoles.Archer] +
		powers[CitizenRoles.Knight];

	if (total === 0) return { power: 0, dominant: null };

	const entries = Object.entries(powers) as [string, number][];
	const max = Math.max(...entries.map(([, v]) => v));
	const top = entries.filter(([, v]) => v === max);

	const dominant =
		top.length === 1 ? (Number(top[0]?.[0]) as CombatRole) : null;

	return { power: total, dominant };
}

interface FrontResult {
	winner: "A" | "B" | "tie";
	powerA: number;
	powerB: number;
	dominantA: CombatRole | null;
	dominantB: CombatRole | null;
}

function resolveFront(
	allocA: FrontAllocation,
	allocB: FrontAllocation,
	armoryA: ArmoryTiers,
	armoryB: ArmoryTiers,
): FrontResult {
	const a = frontPower(allocA, armoryA);
	const b = frontPower(allocB, armoryB);

	let powerA = a.power;
	let powerB = b.power;

	if (a.dominant !== null && b.dominant !== null) {
		if (COUNTERS[a.dominant] === b.dominant) powerA *= COUNTER_BONUS;
		else if (COUNTERS[b.dominant] === a.dominant) powerB *= COUNTER_BONUS;
	}

	const winner = powerA > powerB ? "A" : powerB > powerA ? "B" : "tie";
	return {
		winner,
		powerA,
		powerB,
		dominantA: a.dominant,
		dominantB: b.dominant,
	};
}

export interface BattleResult {
	winner: "A" | "B" | "tie";
	winsA: number;
	winsB: number;
	totalA: number;
	totalB: number;
	breakdown: Record<Front, FrontResult>;
}

export function resolveBattle(
	allocA: Allocation,
	allocB: Allocation,
	armoryA: ArmoryTiers,
	armoryB: ArmoryTiers,
): BattleResult {
	let winsA = 0;
	let winsB = 0;
	let totalA = 0;
	let totalB = 0;
	const breakdown = {} as Record<Front, FrontResult>;

	for (const front of FRONTS) {
		const result = resolveFront(allocA[front], allocB[front], armoryA, armoryB);
		breakdown[front] = result;
		totalA += result.powerA;
		totalB += result.powerB;
		if (result.winner === "A") winsA++;
		else if (result.winner === "B") winsB++;
	}

	let winner: "A" | "B" | "tie";
	if (winsA > winsB) winner = "A";
	else if (winsB > winsA) winner = "B";
	else winner = totalA > totalB ? "A" : totalB > totalA ? "B" : "tie";

	return { winner, winsA, winsB, totalA, totalB, breakdown };
}

export function validateAllocation(
	alloc: Allocation,
	available: FrontAllocation,
): string | null {
	const used: FrontAllocation = {
		[CitizenRoles.Warrior]: 0,
		[CitizenRoles.Archer]: 0,
		[CitizenRoles.Knight]: 0,
	};
	for (const front of FRONTS) {
		used[CitizenRoles.Warrior] += alloc[front][CitizenRoles.Warrior];
		used[CitizenRoles.Archer] += alloc[front][CitizenRoles.Archer];
		used[CitizenRoles.Knight] += alloc[front][CitizenRoles.Knight];
	}

	if (used[CitizenRoles.Warrior] > available[CitizenRoles.Warrior])
		return `You only have ${available[CitizenRoles.Warrior]} Warriors, tried to deploy ${used[CitizenRoles.Warrior]}.`;
	if (used[CitizenRoles.Archer] > available[CitizenRoles.Archer])
		return `You only have ${available[CitizenRoles.Archer]} Archers, tried to deploy ${used[CitizenRoles.Archer]}.`;
	if (used[CitizenRoles.Knight] > available[CitizenRoles.Knight])
		return `You only have ${available[CitizenRoles.Knight]} Knights, tried to deploy ${used[CitizenRoles.Knight]}.`;

	const totalUsed =
		used[CitizenRoles.Warrior] +
		used[CitizenRoles.Archer] +
		used[CitizenRoles.Knight];
	if (totalUsed === 0) return "You must deploy at least one unit somewhere.";

	return null;
}

export function parseFrontInput(input: string): FrontAllocation | null {
	const result: FrontAllocation = {
		[CitizenRoles.Warrior]: 0,
		[CitizenRoles.Archer]: 0,
		[CitizenRoles.Knight]: 0,
	};
	let found = false;
	for (const [, countStr, letter] of input.matchAll(/(\d+)\s*(w|a|k)/gi)) {
		found = true;
		const count = Number.parseInt(countStr ?? "0", 10);
		const l = letter?.toLowerCase();
		if (l === "w") result[CitizenRoles.Warrior] += count;
		else if (l === "a") result[CitizenRoles.Archer] += count;
		else if (l === "k") result[CitizenRoles.Knight] += count;
	}
	return found ? result : null;
}
