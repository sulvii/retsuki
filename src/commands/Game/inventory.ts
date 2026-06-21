import { Command, Declare, Embed, type CommandContext } from "seyfert";
import { db } from "../../db/db";
import { kingdoms, resources } from "../../db/schema";
import { eq } from "drizzle-orm";

const rarityEmoji: Record<string, string> = {
	Common: "⬜",
	Uncommon: "🟩",
	Rare: "🟦",
	Epic: "🟪",
	Legendary: "🟨",
};

const rarityOrder = ["Legendary", "Epic", "Rare", "Uncommon", "Common"];

@Declare({
	name: "inventory",
	description: "See your resources and how much selling them all is worth!",
	aliases: ["inv"],
})
export default class InventoryCommand extends Command {
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

		const owned = db
			.select()
			.from(resources)
			.where(eq(resources.kingdomId, kingdom.kingdomId))
			.all();

		const stocked = owned.filter((r) => r.quantity > 0);

		if (stocked.length === 0) {
			const embed = new Embed()
				.setColor(0xffb7c5)
				.setTitle("🎒 Your Inventory")
				.setDescription(
					"˚ ༘♡ ⋆｡˚  your bag is empty~ go `/mine` to find some treasures!",
				)
				.addFields({
					name: "🪙 Treasury",
					value: `${kingdom.revenue} coins`,
					inline: true,
				})
				.setFooter({ text: "✿ start mining with /mine ✿" })
				.setTimestamp();

			return ctx.editOrReply({ embeds: [embed] });
		}

		const byRarity = new Map<string, typeof stocked>();
		for (const r of stocked) {
			if (!byRarity.has(r.rarity)) byRarity.set(r.rarity, []);
			byRarity.get(r.rarity)!.push(r);
		}

		let totalItems = 0;
		let totalWorth = 0;

		const fields = rarityOrder
			.filter((rarity) => byRarity.has(rarity))
			.map((rarity) => {
				const items = byRarity.get(rarity)!;
				const emoji = rarityEmoji[rarity];

				const lines = items
					.map((r) => {
						const worth = r.quantity * r.sellWorthEach;
						totalItems += r.quantity;
						totalWorth += worth;
						return `${emoji} **${r.item}** ×${r.quantity} — ${worth} coins`;
					})
					.join("\n");

				return {
					name: `${rarity}`,
					value: lines,
					inline: false,
				};
			});

		const embed = new Embed()
			.setColor(0xffb7c5)
			.setTitle("🎒 Your Inventory")
			.setDescription("˚ ༘♡ ⋆｡˚  here's everything tucked away in your kingdom~")
			.addFields(
				{
					name: "🪙 Treasury",
					value: `${kingdom.revenue} coins`,
					inline: true,
				},
				{
					name: "📦 Total Items",
					value: String(totalItems),
					inline: true,
				},
				{
					name: "💰 Worth If Sold All",
					value: `${totalWorth} coins`,
					inline: true,
				},
				...fields,
			)
			.setFooter({ text: "✿ sell with /sell <item/category/all> ✿" })
			.setTimestamp();

		return ctx.editOrReply({ embeds: [embed] });
	}
}
