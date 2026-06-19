import { Cooldown, CooldownType } from "@slipher/cooldown";
import {
	Command,
	Declare,
	Middlewares,
	WebhookMessage,
	type CommandContext,
} from "seyfert";
import { InteractionResponseType, MessageFlags } from "seyfert/lib/types";

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
