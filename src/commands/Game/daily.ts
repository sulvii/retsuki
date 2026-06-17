import {
	Command,
	Declare,
	Middlewares,
	WebhookMessage,
	type CommandContext,
} from "seyfert";
import { db } from "../../db/db";
import { kingdoms } from "../../db/schema";
import { eq } from "drizzle-orm";
import { Cooldown, CooldownType } from "@slipher/cooldown";

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

@Declare({
	name: "daily",
	description: "Claim your daily!",
})
@Cooldown({
	type: CooldownType.User,
	interval: 1000 * 15,
	uses: {
		default: 1,
	},
})
@Middlewares(["cooldown"])
export default class DailyCommand extends Command {
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

		const now = Date.now();
		const last = new Date(kingdom.lastDailyClaimed);
		const diff = now - last.getTime();
		const remaining = COOLDOWN_MS - diff;

		if (remaining > 0) {
			const hours = Math.floor(remaining / (1000 * 60 * 60));
			const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

			return ctx.editOrReply({
				content: `⏳ You already claimed your daily! Come back in **${hours}h ${minutes}m**.`,
			});
		}

		const reward = Math.floor(Math.random() * (200 - 100 + 1)) + 100;

		db.update(kingdoms)
			.set({
				revenue: Number(kingdom.revenue) + reward,
				lastDailyClaimed: now,
			})
			.where(eq(kingdoms.userId, userId))
			.run();

		return ctx.editOrReply({
			content: `✅ You claimed your daily reward of **${reward}** revenue! Come back tomorrow.`,
		});
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
