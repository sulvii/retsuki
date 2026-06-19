import { Cooldown, CooldownType } from "@slipher/cooldown";
import {
	Client,
	Command,
	Declare,
	Middlewares,
	Options,
	WebhookMessage,
	createBooleanOption,
	type CommandContext,
} from "seyfert";
import { InteractionResponseType, MessageFlags } from "seyfert/lib/types";

const options = {
	hide: createBooleanOption({
		description: "Hide the command's response",
	}),
};
@Cooldown({
	type: CooldownType.User,
	interval: 1000 * 15,
	uses: {
		default: 1,
	},
})
@Middlewares(["cooldown"])
@Declare({
	name: "ping",
	description: "Show latency with Discord",
})
@Options(options)
export default class PingCommand extends Command {
	override async run(ctx: CommandContext<typeof options>) {
		const flags = ctx.options.hide ? MessageFlags.Ephemeral : undefined;

		const ping = (ctx.client as Client).gateway.latency;

		await ctx.write({
			content: `The latency is \`${ping}\``,
			flags,
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
		// @ts-expect-error
		const inCooldown = context.client.cooldown.context(context);

		if (typeof inCooldown === "number") {
			setTimeout(async () => {
				await (response as WebhookMessage).delete();
			}, inCooldown);
		}
	}
}
