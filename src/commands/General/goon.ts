import { Cooldown, CooldownType } from "@slipher/cooldown";
import {
	Command,
	Declare,
	Middlewares,
	WebhookMessage,
	type CommandContext,
} from "seyfert";

@Declare({
	name: "goon",
	description: "Uh...",
})
@Cooldown({
	type: CooldownType.User,
	interval: 1000 * 15,
	uses: {
		default: 1,
	},
})
@Middlewares(["cooldown"])
export default class GoonCommand extends Command {
	override async run(ctx: CommandContext) {
		const replies = [
			"You disgust me. Filthy pervert!",
			"Absolutely not.",
			"I am judging you silently.",
			"Please reconsider your life choices.",
		];

		const msg = replies[Math.floor(Math.random() * replies.length)];

		await ctx.write({ content: msg });
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
