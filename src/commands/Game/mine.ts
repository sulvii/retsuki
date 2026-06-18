import {
	Command,
	Declare,
	Embed,
	Middlewares,
	WebhookMessage,
	type CommandContext,
} from "seyfert";
import { db } from "../../db/db";
import { kingdoms, resources } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { MINING_RESOURCES } from "../../db/data/mine-resources";
import { Cooldown, CooldownType } from "@slipher/cooldown";

const MINE_COST = 50;

const rarityEmoji: Record<string, string> = {
	Common: "⬜",
	Uncommon: "🟩",
	Rare: "🟦",
	Epic: "🟪",
	Legendary: "🟨",
};

@Declare({
	name: "mine",
	description: `Spend ${MINE_COST} revenue to mine for resources!`,
})
@Cooldown({
	type: CooldownType.User,
	interval: 1000 * 20,
	uses: {
		default: 1,
	},
})
@Middlewares(["cooldown"])
export default class MineCommand extends Command {
	override async run(ctx: CommandContext) {
		const userId = ctx.author.id;

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

		if (kingdom.revenue < MINE_COST) {
			const embed = new Embed()
				.setColor(0xffb7c5)
				.setDescription(
					`❌ You need at least **${MINE_COST} coins** in your treasury to go mining!`,
				)
				.setFooter({ text: "✿ earn more with /daily ✿" });

			return ctx.editOrReply({ embeds: [embed] });
		}

		const found = MINING_RESOURCES.filter((r) => Math.random() < r.findChance);

		db.update(kingdoms)
			.set({ revenue: Number(kingdom.revenue) - MINE_COST })
			.where(eq(kingdoms.userId, userId))
			.run();

		if (found.length === 0) {
			const embed = new Embed()
				.setColor(0xffb7c5)
				.setTitle("⛏️ Mining Results")
				.setDescription(
					"˚ ༘♡ ⋆｡˚  you swung your pickaxe but found nothing this time...",
				)
				.addFields({
					name: "🪙 Cost",
					value: `−${MINE_COST} coins`,
					inline: true,
				})
				.setFooter({ text: "✿ better luck next time ✿" })
				.setTimestamp();

			return ctx.editOrReply({ embeds: [embed] });
		}

		for (const resource of found) {
			const existing = db
				.select()
				.from(resources)
				.where(
					and(
						eq(resources.kingdomId, kingdom.kingdomId),
						eq(resources.item, resource.name),
					),
				)
				.get();

			if (existing) {
				db.update(resources)
					.set({ quantity: existing.quantity + 1 })
					.where(eq(resources.resourceId, existing.resourceId))
					.run();
			} else {
				db.insert(resources)
					.values({
						resourceId: randomUUID(),
						kingdomId: kingdom.kingdomId,
						item: resource.name,
						rarity: resource.rarity,
						sellWorthEach: resource.sellWorth,
						quantity: 1,
						totalSold: 0,
					})
					.run();
			}
		}

		const byRarity = new Map<string, typeof found>();
		for (const r of found) {
			if (!byRarity.has(r.rarity)) byRarity.set(r.rarity, []);
			byRarity.get(r.rarity)!.push(r);
		}

		const rarityOrder = ["Legendary", "Epic", "Rare", "Uncommon", "Common"];
		const resultsValue = rarityOrder
			.filter((rarity) => byRarity.has(rarity))
			.map((rarity) => {
				const items = byRarity.get(rarity)!;
				const emoji = rarityEmoji[rarity];
				return items
					.map((r) => `${emoji} **${r.name}** — ${rarity}`)
					.join("\n");
			})
			.join("\n");

		const embed = new Embed()
			.setColor(0xffb7c5)
			.setTitle("⛏️ Mining Results")
			.setDescription("˚ ༘♡ ⋆｡˚  you ventured into the mine and returned with~")
			.addFields(
				{
					name: "🪙 Cost",
					value: `−${MINE_COST} coins`,
					inline: true,
				},
				{
					name: "📦 Items Found",
					value: String(found.length),
					inline: true,
				},
				{
					name: "✨ Haul",
					value: resultsValue,
					inline: false,
				},
			)
			.setFooter({ text: "✿ sell your resources with /sell ✿" })
			.setTimestamp();

		return ctx.editOrReply({ embeds: [embed] });
	}

	override async onMiddlewaresError(context: CommandContext, error: string) {
		const reply = await context.editOrReply({ content: error });

		// @ts-expect-error
		const inCooldown = context.client.cooldown.context(context);

		if (typeof inCooldown === "number") {
			setTimeout(async () => {
				await (reply as WebhookMessage).delete();
			}, inCooldown);
		}
	}
}
