import {
	Command,
	Declare,
	Options,
	Middlewares,
	WebhookMessage,
	createIntegerOption,
	type CommandContext,
} from "seyfert";
import { randomUUID } from "node:crypto";
import { db } from "../../db/db";
import { kingdoms, citizens } from "../../db/schema";
import { eq } from "drizzle-orm";
import { Cooldown, CooldownType } from "@slipher/cooldown";
import { InteractionResponseType, MessageFlags } from "seyfert/lib/types";
import { CitizenRoles } from "../../db/data/roles";

const RECRUIT_COSTS: Record<number, number> = {
	[CitizenRoles.Miner]: 50,
	[CitizenRoles.Farmer]: 50,
	[CitizenRoles.Warrior]: 100,
	[CitizenRoles.Archer]: 120,
	[CitizenRoles.Alchemist]: 150,
	[CitizenRoles.Merchant]: 180,
	[CitizenRoles.WeaponSmith]: 220,
	[CitizenRoles.ArmorSmith]: 220,
	[CitizenRoles.Knight]: 300,
};

const ROLE_EMOJIS: Record<number, string> = {
	[CitizenRoles.Miner]: "⛏️",
	[CitizenRoles.Farmer]: "🌾",
	[CitizenRoles.Warrior]: "⚔️",
	[CitizenRoles.Archer]: "🏹",
	[CitizenRoles.Alchemist]: "🧪",
	[CitizenRoles.Merchant]: "💰",
	[CitizenRoles.WeaponSmith]: "🔨",
	[CitizenRoles.ArmorSmith]: "🛡️",
	[CitizenRoles.Knight]: "🐎",
};

const options = {
	role: createIntegerOption({
		description: "The role you want to recruit a citizen for",
		required: true,
		choices: [
			{
				name: `⛏️ Miner — ${RECRUIT_COSTS[CitizenRoles.Miner]} coins`,
				value: CitizenRoles.Miner,
			},
			{
				name: `🌾 Farmer — ${RECRUIT_COSTS[CitizenRoles.Farmer]} coins`,
				value: CitizenRoles.Farmer,
			},
			{
				name: `⚔️ Warrior — ${RECRUIT_COSTS[CitizenRoles.Warrior]} coins`,
				value: CitizenRoles.Warrior,
			},
			{
				name: `🏹 Archer — ${RECRUIT_COSTS[CitizenRoles.Archer]} coins`,
				value: CitizenRoles.Archer,
			},
			{
				name: `🧪 Alchemist — ${RECRUIT_COSTS[CitizenRoles.Alchemist]} coins`,
				value: CitizenRoles.Alchemist,
			},
			{
				name: `💰 Merchant — ${RECRUIT_COSTS[CitizenRoles.Merchant]} coins`,
				value: CitizenRoles.Merchant,
			},
			{
				name: `🔨 Weapon Smith — ${RECRUIT_COSTS[CitizenRoles.WeaponSmith]} coins`,
				value: CitizenRoles.WeaponSmith,
			},
			{
				name: `🛡️ Armor Smith — ${RECRUIT_COSTS[CitizenRoles.ArmorSmith]} coins`,
				value: CitizenRoles.ArmorSmith,
			},
			{
				name: `🐎 Knight — ${RECRUIT_COSTS[CitizenRoles.Knight]} coins`,
				value: CitizenRoles.Knight,
			},
		] as const,
	}),
	amount: createIntegerOption({
		description: "How many citizens to recruit (default 1)",
		required: false,
		min_value: 1,
		max_value: 10,
	}),
};

@Declare({
	name: "recruit",
	description: "Recruit a new citizen for your kingdom!",
})
@Options(options)
@Cooldown({
	type: CooldownType.User,
	interval: 1000 * 5,
	uses: {
		default: 1,
	},
})
@Middlewares(["cooldown"])
export default class RecruitCommand extends Command {
	override async run(ctx: CommandContext<typeof options>) {
		const userId = ctx.author.id;
		const role = ctx.options.role;
		const amount = ctx.options.amount ?? 1;

		const kingdom = db
			.select()
			.from(kingdoms)
			.where(eq(kingdoms.userId, userId))
			.get();

		if (!kingdom) {
			return ctx.editOrReply({
				content:
					"❌ You don't have a kingdom yet! Use `/kingdom create` first.",
			});
		}

		const costEach = RECRUIT_COSTS[role];

		if (!costEach) {
			return ctx.editOrReply({
				content: "Error while calculating cost. Invalid role perhaps.",
			});
		}

		const totalCost = costEach * amount;
		const currentRevenue = Number(kingdom.revenue);

		if (currentRevenue < totalCost) {
			return ctx.editOrReply({
				content: `❌ Not enough coins! Recruiting **${amount}x ${CitizenRoles[role]}** costs **${totalCost}** coins, but your treasury only has **${Math.floor(currentRevenue)}**.`,
			});
		}

		const newCitizens = Array.from({ length: amount }, () => ({
			citizenId: randomUUID(),
			role,
			kingdomId: kingdom.kingdomId,
		}));

		db.insert(citizens).values(newCitizens).run();

		const remaining = currentRevenue - totalCost;

		db.update(kingdoms)
			.set({ revenue: remaining })
			.where(eq(kingdoms.userId, userId))
			.run();

		const emoji = ROLE_EMOJIS[role] ?? "👤";

		return ctx.editOrReply({
			content: `✅ Recruited **${amount}x ${emoji} ${CitizenRoles[role]}** for **${totalCost}** coins!\n💰 Remaining revenue: **${Math.floor(remaining)}**.`,
		});
	}

	override async onMiddlewaresError(context: CommandContext, error: string) {
		const response = context.interaction?.isChatInput()
			? await context.interaction.reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: error,
						flags: MessageFlags.Ephemeral,
					},
				})
			: await context.write({
					content: error,
				});
		const inCooldown = context.client.cooldown.context(context);

		if (typeof inCooldown === "number") {
			setTimeout(async () => {
				await (response as WebhookMessage).delete();
			}, inCooldown);
		}
	}
}
