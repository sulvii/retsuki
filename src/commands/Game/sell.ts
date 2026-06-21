import {
	Command,
	Declare,
	Embed,
	Options,
	createStringOption,
	createIntegerOption,
	type CommandContext,
} from "seyfert";
import { db } from "../../db/db";
import { kingdoms, resources } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { MINING_RESOURCES } from "../../db/data/mine-resources";

const RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"] as const;
type Rarity = (typeof RARITIES)[number];

const options = {
	target: createStringOption({
		description: "Item name, rarity category, or 'all'",
		required: true,
	}),
	amount: createIntegerOption({
		description: "How many to sell (not needed for 'all' or category)",
		required: false,
		min_value: 1,
	}),
};

@Declare({
	name: "sell",
	description: "Sell your mined resources for coins!",
})
@Options(options)
export default class SellCommand extends Command {
	override async run(ctx: CommandContext<typeof options>) {
		const userId = ctx.author.id;
		const { target, amount } = ctx.options;

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

		const normalizedTarget = target.trim().toLowerCase();

		if (normalizedTarget === "all") {
			const owned = db
				.select()
				.from(resources)
				.where(eq(resources.kingdomId, kingdom.kingdomId))
				.all();

			const sellable = owned.filter((r) => r.quantity > 0);

			if (sellable.length === 0) {
				const embed = new Embed()
					.setColor(0xffb7c5)
					.setDescription(
						"❌ You don't have any resources to sell yet~ go `/mine` first!",
					);
				return ctx.editOrReply({ embeds: [embed] });
			}

			let totalEarned = 0;
			let totalQty = 0;
			for (const r of sellable) {
				totalEarned += r.quantity * r.sellWorthEach;
				totalQty += r.quantity;
				db.update(resources)
					.set({ quantity: 0, totalSold: r.totalSold + r.quantity })
					.where(eq(resources.resourceId, r.resourceId))
					.run();
			}

			db.update(kingdoms)
				.set({ revenue: Number(kingdom.revenue) + totalEarned })
				.where(eq(kingdoms.userId, userId))
				.run();

			const embed = new Embed()
				.setColor(0xffb7c5)
				.setTitle("💰 Sold Everything!")
				.setDescription("˚ ༘♡ ⋆｡˚  you cleared out your whole stockpile~")
				.addFields(
					{ name: "📦 Items Sold", value: String(totalQty), inline: true },
					{ name: "🪙 Earned", value: `+${totalEarned} coins`, inline: true },
				)
				.setFooter({ text: "✿ go mine some more with /mine ✿" })
				.setTimestamp();

			return ctx.editOrReply({ embeds: [embed] });
		}

		const matchedRarity = RARITIES.find(
			(r) => r.toLowerCase() === normalizedTarget,
		) as Rarity | undefined;

		if (matchedRarity) {
			const owned = db
				.select()
				.from(resources)
				.where(
					and(
						eq(resources.kingdomId, kingdom.kingdomId),
						eq(resources.rarity, matchedRarity),
					),
				)
				.all();

			const sellable = owned.filter((r) => r.quantity > 0);

			if (sellable.length === 0) {
				const embed = new Embed()
					.setColor(0xffb7c5)
					.setDescription(
						`❌ You don't have any **${matchedRarity}** resources to sell~`,
					);
				return ctx.editOrReply({ embeds: [embed] });
			}

			let totalEarned = 0;
			let totalQty = 0;
			for (const r of sellable) {
				totalEarned += r.quantity * r.sellWorthEach;
				totalQty += r.quantity;
				db.update(resources)
					.set({ quantity: 0, totalSold: r.totalSold + r.quantity })
					.where(eq(resources.resourceId, r.resourceId))
					.run();
			}

			db.update(kingdoms)
				.set({ revenue: Number(kingdom.revenue) + totalEarned })
				.where(eq(kingdoms.userId, userId))
				.run();

			const embed = new Embed()
				.setColor(0xffb7c5)
				.setTitle(`💰 Sold all ${matchedRarity} resources!`)
				.setDescription("˚ ༘♡ ⋆｡˚  cha-ching~")
				.addFields(
					{ name: "📦 Items Sold", value: String(totalQty), inline: true },
					{ name: "🪙 Earned", value: `+${totalEarned} coins`, inline: true },
				)
				.setFooter({ text: "✿ go mine some more with /mine ✿" })
				.setTimestamp();

			return ctx.editOrReply({ embeds: [embed] });
		}

		const matchedResource = MINING_RESOURCES.find(
			(r) => r.name.toLowerCase() === normalizedTarget,
		);

		if (!matchedResource) {
			const embed = new Embed()
				.setColor(0xffb7c5)
				.setDescription(
					`❌ I couldn't find an item or category called **${target}**~ double check the spelling!`,
				);
			return ctx.editOrReply({ embeds: [embed] });
		}

		const existing = db
			.select()
			.from(resources)
			.where(
				and(
					eq(resources.kingdomId, kingdom.kingdomId),
					eq(resources.item, matchedResource.name),
				),
			)
			.get();

		if (!existing || existing.quantity <= 0) {
			const embed = new Embed()
				.setColor(0xffb7c5)
				.setDescription(
					`❌ You don't have any **${matchedResource.name}** to sell~ go \`/mine\` first!`,
				);
			return ctx.editOrReply({ embeds: [embed] });
		}

		const sellAmount = amount ?? existing.quantity;

		if (sellAmount <= 0) {
			return ctx.editOrReply({
				content: "❌ Amount must be at least 1, silly~",
			});
		}

		if (sellAmount > existing.quantity) {
			const embed = new Embed()
				.setColor(0xffb7c5)
				.setDescription(
					`❌ You only have **${existing.quantity}x ${matchedResource.name}**, you can't sell ${sellAmount}~`,
				);
			return ctx.editOrReply({ embeds: [embed] });
		}

		const earned = sellAmount * existing.sellWorthEach;

		db.update(resources)
			.set({
				quantity: existing.quantity - sellAmount,
				totalSold: existing.totalSold + sellAmount,
			})
			.where(eq(resources.resourceId, existing.resourceId))
			.run();

		db.update(kingdoms)
			.set({ revenue: Number(kingdom.revenue) + earned })
			.where(eq(kingdoms.userId, userId))
			.run();

		const embed = new Embed()
			.setColor(0xffb7c5)
			.setTitle("💰 Sold!")
			.setDescription(`˚ ༘♡ ⋆｡˚  you sold your ${matchedResource.name}~`)
			.addFields(
				{
					name: "📦 Item",
					value: `${sellAmount}x ${matchedResource.name}`,
					inline: true,
				},
				{ name: "🪙 Earned", value: `+${earned} coins`, inline: true },
			)
			.setFooter({ text: "✿ go mine some more with /mine ✿" })
			.setTimestamp();

		return ctx.editOrReply({ embeds: [embed] });
	}
}
