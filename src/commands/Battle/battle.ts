import {
	Command,
	Declare,
	Options,
	createUserOption,
	ActionRow,
	Button,
	Modal,
	TextInput,
	type CommandContext,
	Label,
	Client,
	type UsingClient,
} from "seyfert";
import { ButtonStyle, TextInputStyle } from "seyfert/lib/types";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/db";
import { kingdoms, battles, citizens, armory } from "../../db/schema";
import { CitizenRoles } from "../../db/data/roles";
import {
	FRONTS,
	resolveBattle,
	validateAllocation,
	parseFrontInput,
	type Allocation,
	type FrontAllocation,
} from "../../battle/engine";
import {
	MIN_TREASURY_TO_BATTLE,
	SAME_TARGET_COOLDOWN_MS,
	checkWarFatigue,
	hasActiveBattle,
	getLastResolvedBattleBetween,
	formatDuration,
} from "../../battle/rules";

const options = {
	opponent: createUserOption({
		description: "Who do you want to battle?",
		required: true,
	}),
};

function getOrCreateArmory(kingdomId: string) {
	let a = db.select().from(armory).where(eq(armory.kingdomId, kingdomId)).get();
	if (!a) {
		db.insert(armory).values({ kingdomId }).run();
		a = db.select().from(armory).where(eq(armory.kingdomId, kingdomId)).get();
	}
	return a!;
}

function getCombatCounts(kingdomId: string): FrontAllocation {
	const all = db
		.select()
		.from(citizens)
		.where(eq(citizens.kingdomId, kingdomId))
		.all();
	return {
		[CitizenRoles.Warrior]: all.filter((c) => c.role === CitizenRoles.Warrior)
			.length,
		[CitizenRoles.Archer]: all.filter((c) => c.role === CitizenRoles.Archer)
			.length,
		[CitizenRoles.Knight]: all.filter((c) => c.role === CitizenRoles.Knight)
			.length,
	};
}

async function tryResolveBattle(
	client: Client | UsingClient,
	battleId: string,
) {
	const battle = db
		.select()
		.from(battles)
		.where(eq(battles.battleId, battleId))
		.get();
	if (!battle || !battle.challengerAllocation || !battle.defenderAllocation)
		return;

	const challengerKingdom = db
		.select()
		.from(kingdoms)
		.where(eq(kingdoms.userId, battle.challengerId))
		.get()!;
	const defenderKingdom = db
		.select()
		.from(kingdoms)
		.where(eq(kingdoms.userId, battle.defenderId))
		.get()!;

	const armoryC = getOrCreateArmory(challengerKingdom.kingdomId);
	const armoryD = getOrCreateArmory(defenderKingdom.kingdomId);

	const allocC: Allocation = JSON.parse(battle.challengerAllocation);
	const allocD: Allocation = JSON.parse(battle.defenderAllocation);

	const result = resolveBattle(allocC, allocD, armoryC, armoryD);
	const now = Date.now();

	let winnerId: string | null = null;
	let resultLine: string;

	if (result.winner === "tie") {
		resultLine =
			"🤝 Complete stalemate — no coins change hands, but both armies are exhausted.";
		db.update(kingdoms)
			.set({ lastBattleAt: now })
			.where(eq(kingdoms.kingdomId, challengerKingdom.kingdomId))
			.run();
		db.update(kingdoms)
			.set({ lastBattleAt: now })
			.where(eq(kingdoms.kingdomId, defenderKingdom.kingdomId))
			.run();
	} else {
		const challengerWon = result.winner === "A";
		winnerId = challengerWon ? battle.challengerId : battle.defenderId;
		const loserKingdom = challengerWon ? defenderKingdom : challengerKingdom;
		const winnerKingdom = challengerWon ? challengerKingdom : defenderKingdom;

		const stolen = Math.floor(Number(loserKingdom.revenue) * 0.8);

		db.update(kingdoms)
			.set({
				revenue: Number(loserKingdom.revenue) - stolen,
				lastBattleAt: now,
			})
			.where(eq(kingdoms.kingdomId, loserKingdom.kingdomId))
			.run();
		db.update(kingdoms)
			.set({
				revenue: Number(winnerKingdom.revenue) + stolen,
				lastBattleAt: now,
			})
			.where(eq(kingdoms.kingdomId, winnerKingdom.kingdomId))
			.run();

		resultLine = `🏆 <@${winnerId}> wins **${Math.max(result.winsA, result.winsB)}-${Math.min(result.winsA, result.winsB)}** on fronts and loots **${stolen}** coins!`;
	}

	db.update(battles)
		.set({ status: "resolved", winnerId, resolvedAt: now })
		.where(eq(battles.battleId, battleId))
		.run();

	const breakdown = FRONTS.map((front) => {
		const f = result.breakdown[front];
		const label = front[0]?.toUpperCase() + front.slice(1);
		const side =
			f.winner === "tie" ? "Tie" : f.winner === "A" ? "Challenger" : "Defender";
		return `**${label}**: ${Math.round(f.powerA)} vs ${Math.round(f.powerB)} → ${side}`;
	}).join("\n");

	await client.messages.write(battle.channelId, {
		content: `⚔️ **Battle resolved!**\n\n${breakdown}\n\n${resultLine}\n\n🛌 Both kingdoms are now fatigued for 24h.`,
	});
}

function buildDeployModal(battleId: string, userId: string) {
	return new Modal()
		.setCustomId(`battle_modal_${battleId}_${userId}`)
		.setTitle("Deploy your troops")
		.setComponents([
			new Label()
				.setLabel("Vanguard")
				.setComponent(
					new TextInput()
						.setCustomId("vanguard")
						.setStyle(TextInputStyle.Short)
						.setPlaceholder("e.g. '3w 2a 1k'")
						.setRequired(true),
				),
			new Label()
				.setLabel("Flank")
				.setComponent(
					new TextInput()
						.setCustomId("flank")
						.setStyle(TextInputStyle.Short)
						.setPlaceholder("e.g. '0w 3a 0k'")
						.setRequired(true),
				),
			new Label()
				.setLabel("Rearguard")
				.setComponent(
					new TextInput()
						.setCustomId("rearguard")
						.setStyle(TextInputStyle.Short)
						.setPlaceholder("e.g. '1w 0a 2k'")
						.setRequired(true),
				),
		])
		.run(async (modalCtx) => {
			const vanguard = parseFrontInput(
				modalCtx.getInputValue("vanguard") as string,
			);
			const flank = parseFrontInput(modalCtx.getInputValue("flank") as string);
			const rearguard = parseFrontInput(
				modalCtx.getInputValue("rearguard") as string,
			);

			if (!vanguard || !flank || !rearguard) {
				return modalCtx.write({
					content: "❌ Couldn't parse a front. Use a format like `3w 2a 1k`.",
					flags: 64,
				});
			}

			const allocation: Allocation = { vanguard, flank, rearguard };

			const kingdom = db
				.select()
				.from(kingdoms)
				.where(eq(kingdoms.userId, userId))
				.get()!;
			const available = getCombatCounts(kingdom.kingdomId);
			const error = validateAllocation(allocation, available);
			if (error) return modalCtx.write({ content: `❌ ${error}`, flags: 64 });

			const battle = db
				.select()
				.from(battles)
				.where(eq(battles.battleId, battleId))
				.get()!;
			const field =
				userId === battle.challengerId
					? "challengerAllocation"
					: "defenderAllocation";

			db.update(battles)
				.set({ [field]: JSON.stringify(allocation) })
				.where(eq(battles.battleId, battleId))
				.run();

			await modalCtx.write({
				content: "✅ Troops deployed in secret. Waiting on the other side...",
				flags: 64,
			});

			const updated = db
				.select()
				.from(battles)
				.where(eq(battles.battleId, battleId))
				.get()!;
			if (updated.challengerAllocation && updated.defenderAllocation) {
				await tryResolveBattle(modalCtx.client, battleId);
			}
		});
}

@Declare({
	name: "battle",
	description: "Challenge another kingdom to a strategic battle!",
})
@Options(options)
export default class BattleCommand extends Command {
	override async run(ctx: CommandContext<typeof options>) {
		const challengerId = ctx.author.id;
		const defenderId = ctx.options.opponent.id;

		if (challengerId === defenderId) {
			return ctx.editOrReply({ content: "❌ You can't battle yourself." });
		}

		const challengerKingdom = db
			.select()
			.from(kingdoms)
			.where(eq(kingdoms.userId, challengerId))
			.get();
		const defenderKingdom = db
			.select()
			.from(kingdoms)
			.where(eq(kingdoms.userId, defenderId))
			.get();

		if (!challengerKingdom)
			return ctx.editOrReply({
				content:
					"❌ You don't have a kingdom yet! Use `/kingdom create` first.",
			});
		if (!defenderKingdom)
			return ctx.editOrReply({ content: "❌ They don't have a kingdom yet." });

		if (Number(challengerKingdom.revenue) < MIN_TREASURY_TO_BATTLE) {
			return ctx.editOrReply({
				content: `❌ You need at least **${MIN_TREASURY_TO_BATTLE}** coins to wage war. You have **${Math.floor(Number(challengerKingdom.revenue))}**.`,
			});
		}
		if (Number(defenderKingdom.revenue) < MIN_TREASURY_TO_BATTLE) {
			return ctx.editOrReply({
				content: `❌ Their treasury is under **${MIN_TREASURY_TO_BATTLE}** coins — small kingdoms are protected from raids.`,
			});
		}

		const challengerFatigue = checkWarFatigue(challengerKingdom);
		if (challengerFatigue) {
			return ctx.editOrReply({
				content: `❌ Your army is still recovering. Wait **${challengerFatigue}**.`,
			});
		}
		const defenderFatigue = checkWarFatigue(defenderKingdom);
		if (defenderFatigue) {
			return ctx.editOrReply({
				content: `❌ Their kingdom is still recovering. Try again in **${defenderFatigue}**.`,
			});
		}

		if (hasActiveBattle(challengerId)) {
			return ctx.editOrReply({
				content: "❌ You already have a battle in progress.",
			});
		}
		if (hasActiveBattle(defenderId)) {
			return ctx.editOrReply({
				content: "❌ They already have a battle in progress.",
			});
		}

		const lastBattle = getLastResolvedBattleBetween(challengerId, defenderId);
		if (lastBattle?.resolvedAt) {
			const elapsed = Date.now() - lastBattle.resolvedAt;
			if (elapsed < SAME_TARGET_COOLDOWN_MS) {
				return ctx.editOrReply({
					content: `❌ You've already fought <@${defenderId}> recently. Attack them again in **${formatDuration(SAME_TARGET_COOLDOWN_MS - elapsed)}**.`,
				});
			}
		}

		const challengerTroops = getCombatCounts(challengerKingdom.kingdomId);
		const challengerTotal =
			challengerTroops[CitizenRoles.Warrior] +
			challengerTroops[CitizenRoles.Archer] +
			challengerTroops[CitizenRoles.Knight];
		if (challengerTotal === 0) {
			return ctx.editOrReply({
				content:
					"❌ You have no combat units! Recruit Warriors, Archers, or Knights first.",
			});
		}

		const defenderTroops = getCombatCounts(defenderKingdom.kingdomId);
		const defenderTotal =
			defenderTroops[CitizenRoles.Warrior] +
			defenderTroops[CitizenRoles.Archer] +
			defenderTroops[CitizenRoles.Knight];
		if (defenderTotal === 0) {
			return ctx.editOrReply({
				content: "❌ They have no combat units to defend with.",
			});
		}

		const battleId = randomUUID();

		db.insert(battles)
			.values({
				battleId,
				challengerId,
				defenderId,
				status: "pending",
				channelId: ctx.channelId,
				createdAt: Date.now(),
			})
			.run();

		const row = new ActionRow<Button>().addComponents(
			new Button()
				.setCustomId(`battle_accept_${battleId}`)
				.setLabel("⚔️ Accept Challenge")
				.setStyle(ButtonStyle.Success),
			new Button()
				.setCustomId(`battle_decline_${battleId}`)
				.setLabel("🏳️ Decline")
				.setStyle(ButtonStyle.Danger),
		);

		const message = await ctx.editOrReply(
			{
				content: `⚔️ <@${challengerId}> has challenged <@${defenderId}> to battle for **80% of the loser's treasury**!\n<@${defenderId}>, do you accept?`,
				components: [row],
			},
			true,
		);

		const collector = message.createComponentCollector({
			idle: 10 * 60 * 1000,
		});

		collector.run(`battle_accept_${battleId}`, async (interaction) => {
			if (interaction.user.id !== defenderId) {
				return interaction.write({
					content: "This isn't your challenge to accept.",
					flags: 64,
				});
			}

			db.update(battles)
				.set({ status: "deploying" })
				.where(eq(battles.battleId, battleId))
				.run();

			const deployRow = new ActionRow<Button>().addComponents(
				new Button()
					.setCustomId(`battle_deploy_${battleId}_${challengerId}`)
					.setLabel("🛡️ Deploy (Challenger)")
					.setStyle(ButtonStyle.Primary),
				new Button()
					.setCustomId(`battle_deploy_${battleId}_${defenderId}`)
					.setLabel("🛡️ Deploy (Defender)")
					.setStyle(ButtonStyle.Primary),
			);

			await interaction.update({
				content: `✅ Challenge accepted! Both sides now secretly deploy across **3 fronts**. Click your button — your allocation stays hidden until both sides commit.`,
				components: [deployRow],
			});

			collector.run(`battle_deploy_${battleId}_${challengerId}`, async (i) => {
				if (i.user.id !== challengerId)
					return i.write({ content: "Not your deploy slot.", flags: 64 });
				await i.modal(buildDeployModal(battleId, challengerId));
			});

			collector.run(`battle_deploy_${battleId}_${defenderId}`, async (i) => {
				if (i.user.id !== defenderId)
					return i.write({ content: "Not your deploy slot.", flags: 64 });
				await i.modal(buildDeployModal(battleId, defenderId));
			});
		});

		collector.run(`battle_decline_${battleId}`, async (interaction) => {
			if (interaction.user.id !== defenderId) {
				return interaction.write({
					content: "This isn't your challenge to decline.",
					flags: 64,
				});
			}
			db.update(battles)
				.set({ status: "declined" })
				.where(eq(battles.battleId, battleId))
				.run();
			await interaction.update({
				content: `🏳️ <@${defenderId}> declined the challenge.`,
				components: [],
			});
		});
	}
}
