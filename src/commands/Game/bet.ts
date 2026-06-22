import {
	Command,
	Declare,
	Embed,
	Options,
	createStringOption,
	type CommandContext,
} from "seyfert";
import { db } from "../../db/db";
import { kingdoms } from "../../db/schema";
import { eq } from "drizzle-orm";

const MAX_BET = 500_000;

const STREAK_THRESHOLD = 2;
const PENALTY_PER_WIN = 0.15;
const MIN_WIN_CHANCE = 0.1;
const BASE_WIN_CHANCE = 0.5;

const winStreaks = new Map<string, number>();

function getWinChance(streak: number): number {
	if (streak < STREAK_THRESHOLD) return BASE_WIN_CHANCE;
	const penalty = (streak - (STREAK_THRESHOLD - 1)) * PENALTY_PER_WIN;
	return Math.max(BASE_WIN_CHANCE - penalty, MIN_WIN_CHANCE);
}

const options = {
	amount: createStringOption({
		description: "Amount to bet (numeric or 'all')",
		required: true,
	}),
	choice: createStringOption({
		description: "Choose between Heads or Tails",
		required: false,
	}),
};

@Declare({
	name: "bet",
	description: `Flip a coin and bet your revenue! odds get spicy on a win streak~ (max ${MAX_BET} coins)`,
	aliases: ["bet", "coinflip", "cf"],
})
@Options(options)
export default class BetCommand extends Command {
	override async run(ctx: CommandContext<typeof options>) {
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

		const revenue = Number(kingdom.revenue);

		if (revenue <= 0) {
			const embed = new Embed()
				.setColor(0xffb7c5)
				.setDescription(
					"😢 You have no coins to bet! Earn some with `/mine` first~",
				)
				.setFooter({ text: "✿ better luck next time ✿" });

			return ctx.editOrReply({ embeds: [embed] });
		}

		const betAmountStr = ctx.options.amount.trim().toLowerCase();
		let betAmount: number;

		if (betAmountStr === "all") {
			betAmount = Math.min(revenue, MAX_BET);
		} else {
			betAmount = Number(betAmountStr);

			if (Number.isNaN(betAmount) || betAmount <= 0) {
				const embed = new Embed()
					.setColor(0xffb7c5)
					.setDescription(
						"❌ Invalid bet amount! It must be a number greater than 0, or `all`.",
					);
				return ctx.editOrReply({ embeds: [embed] });
			}

			if (betAmount > MAX_BET) {
				const embed = new Embed()
					.setColor(0xffb7c5)
					.setDescription(
						`❌ You can't bet more than **${MAX_BET}** coins at once!`,
					);
				return ctx.editOrReply({ embeds: [embed] });
			}

			if (betAmount > revenue) {
				const embed = new Embed()
					.setColor(0xffb7c5)
					.setDescription(
						`❌ You can't bet more than what you have! You only have **${revenue} coins**.`,
					);
				return ctx.editOrReply({ embeds: [embed] });
			}
		}

		const rawChoice = ctx.options.choice?.toLowerCase() ?? "heads";
		let choice: "h" | "t";

		switch (rawChoice) {
			case "tails":
			case "tail":
			case "t":
				choice = "t";
				break;
			case "heads":
			case "head":
			case "h":
			default:
				choice = "h";
				break;
		}

		const currentStreak = winStreaks.get(userId) ?? 0;
		const winChance = getWinChance(currentStreak);
		const won = Math.random() < winChance;

		const flipResult: "h" | "t" = won ? choice : choice === "h" ? "t" : "h";
		const resultStr = flipResult === "h" ? "Heads" : "Tails";
		const newRevenue = won ? revenue + betAmount : revenue - betAmount;

		db.update(kingdoms)
			.set({ revenue: newRevenue })
			.where(eq(kingdoms.userId, userId))
			.run();

		let newStreak: number;
		if (won) {
			newStreak = currentStreak + 1;
			winStreaks.set(userId, newStreak);
		} else {
			newStreak = 0;
			winStreaks.delete(userId);
		}

		const isSpicy = currentStreak >= STREAK_THRESHOLD;
		const oddsLabel = `${Math.round(winChance * 100)}% win chance`;

		const embed = new Embed()
			.setColor(won ? 0xffb7c5 : 0xc9c9c9)
			.setTitle(won ? "🪙 You Won!" : "🪙 You Lost!")
			.setDescription(
				won
					? `˚ ༘♡ ⋆｡˚  the coin landed on **${resultStr}**! lucky you~${isSpicy ? " 🔥 the odds were against you and you still won!" : ""}`
					: `˚ ༘♡ ⋆｡˚  the coin landed on **${resultStr}**... streak reset back to a fair 50-50~`,
			)
			.addFields(
				{
					name: won ? "🪙 Won" : "🪙 Lost",
					value: `${won ? "+" : "−"}${betAmount} coins`,
					inline: true,
				},
				{
					name: "💰 New Balance",
					value: `${newRevenue} coins`,
					inline: true,
				},
				{
					name: "🔥 Win Streak",
					value: won ? `${newStreak}x` : "reset to 0",
					inline: true,
				},
				{
					name: "🎲 Odds",
					value: oddsLabel,
					inline: true,
				},
			)
			.setFooter({
				text:
					newStreak >= STREAK_THRESHOLD
						? "✿ careful~ your luck is starting to run thin! ✿"
						: "✿ try again with /bet ✿",
			})
			.setTimestamp();

		return ctx.editOrReply({ embeds: [embed] });
	}
}
