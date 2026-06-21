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
import { eq } from "drizzle-orm";
import { Cooldown, CooldownType } from "@slipher/cooldown";
import { InteractionResponseType, MessageFlags } from "seyfert/lib/types";

const rarityEmoji: Record<string, string> = {
	Common: "⬜",
	Uncommon: "🟩",
	Rare: "🟦",
	Epic: "🟪",
	Legendary: "🟨",
};

const rarityOrder = ["Legendary", "Epic", "Rare", "Uncommon", "Common"];

@Declare({
	name: "resources",
	description: "View all resources in your kingdom's inventory!",
})
@Cooldown({
	type: CooldownType.User,
	interval: 1000 * 15,
	uses: {
		default: 1,
	},
})
@Middlewares(["cooldown"])
export default class ResourcesCommand extends Command {
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

		const inventory = db
			.select()
			.from(resources)
			.where(eq(resources.kingdomId, kingdom.kingdomId))
			.all();

		if (inventory.length === 0) {
			const embed = new Embed()
				.setColor(0xffb7c5)
				.setTitle(`📦 ${kingdom.name}'s Resources`)
				.setDescription(
					"˚ ༘♡ ⋆｡˚  your storage is empty~ go mining with `/mine`!",
				)
				.setFooter({ text: "✿ resources await you ✿" })
				.setTimestamp();

			return ctx.editOrReply({ embeds: [embed] });
		}

		// Group by rarity
		const byRarity = new Map<string, typeof inventory>();
		for (const r of inventory) {
			if (!byRarity.has(r.rarity)) byRarity.set(r.rarity, []);
			byRarity.get(r.rarity)!.push(r);
		}

		const totalItems = inventory.reduce((sum, r) => sum + r.quantity, 0);
		const totalWorth = inventory.reduce(
			(sum, r) => sum + r.quantity * r.sellWorthEach,
			0,
		);

		const fields = rarityOrder
			.filter((rarity) => byRarity.has(rarity))
			.map((rarity) => {
				const items = byRarity.get(rarity)!;
				const emoji = rarityEmoji[rarity];
				const value = items
					.map(
						(r) =>
							`${emoji} **${r.item}** ×${r.quantity} — ${r.quantity * r.sellWorthEach} coins`,
					)
					.join("\n");

				return {
					name: `${emoji} ${rarity}`,
					value,
					inline: false,
				};
			});

		const embed = new Embed()
			.setColor(0xffb7c5)
			.setAuthor({ name: `${ctx.author.username}'s Kingdom` })
			.setTitle(`📦 ${kingdom.name}'s Resources`)
			.setDescription("˚ ༘♡ ⋆｡˚  here's what's stored in your kingdom~")
			.addFields(
				{
					name: "📊 Total Items",
					value: String(totalItems),
					inline: true,
				},
				{
					name: "💰 Total Worth",
					value: `${totalWorth.toLocaleString()} coins`,
					inline: true,
				},
				{
					name: "🗃️ Unique Resources",
					value: String(inventory.length),
					inline: true,
				},
				...fields,
			)
			.setFooter({ text: "✿ sell your resources with /sell ✿" })
			.setTimestamp();

		return ctx.editOrReply({ embeds: [embed] });
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
