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
import { Formatter } from "seyfert";
import { TimestampStyle } from "seyfert/lib/common";
import { InteractionResponseType, MessageFlags } from "seyfert/lib/types";

@Declare({
	name: "revenue",
	description: "View a detailed breakdown of your kingdom's revenue!",
})
@Cooldown({
	type: CooldownType.User,
	interval: 1000 * 15,
	uses: {
		default: 1,
	},
})
@Middlewares(["cooldown"])
export default class RevenueCommand extends Command {
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

		const totalSoldCoins = inventory.reduce(
			(sum, r) => sum + r.totalSold * r.sellWorthEach,
			0,
		);

		const inventoryWorth = inventory.reduce(
			(sum, r) => sum + r.quantity * r.sellWorthEach,
			0,
		);

		const neverClaimed = kingdom.lastDailyClaimed === 0;
		const lastClaimed = new Date(kingdom.lastDailyClaimed);
		const nextClaimTime = new Date(lastClaimed.getTime() + 24 * 60 * 60 * 1000);
		const canClaimNow = neverClaimed || Date.now() >= nextClaimTime.getTime();

		const dailyStatus = canClaimNow
			? "✅ Ready to claim!"
			: `⏳ ${Formatter.timestamp(nextClaimTime, TimestampStyle.RelativeTime)}`;

		const lastClaimedValue = neverClaimed
			? "*Never claimed~*"
			: Formatter.timestamp(lastClaimed, TimestampStyle.RelativeTime);

		const embed = new Embed()
			.setColor(0xffb7c5)
			.setAuthor({ name: `${ctx.author.username}'s Kingdom` })
			.setTitle(`🪙 ${kingdom.name}'s Revenue`)
			.setDescription("˚ ༘♡ ⋆｡˚  here's a full picture of your treasury~")
			.addFields(
				{
					name: "💰 Current Balance",
					value: Formatter.bold(
						`${Number(kingdom.revenue).toLocaleString()} coins`,
					),
					inline: true,
				},
				{
					name: "📦 Inventory Worth",
					value: `${inventoryWorth.toLocaleString()} coins`,
					inline: true,
				},
				{
					name: "📈 Total Earned from Sales",
					value: `${totalSoldCoins.toLocaleString()} coins`,
					inline: true,
				},
				{
					name: "🌸 Daily Reward",
					value: dailyStatus,
					inline: true,
				},
				{
					name: "🕰️ Last Claimed",
					value: lastClaimedValue,
					inline: true,
				},
			)
			.setFooter({ text: "✿ keep earning, keep growing ✿" })
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
		// @ts-expect-error
		const inCooldown = context.client.cooldown.context(context);

		if (typeof inCooldown === "number") {
			setTimeout(async () => {
				await (response as WebhookMessage).delete();
			}, inCooldown);
		}
	}
}
