import { Cooldown, CooldownType } from "@slipher/cooldown";
import {
	Command,
	createUserOption,
	Declare,
	Embed,
	Middlewares,
	Options,
	WebhookMessage,
	type CommandContext,
} from "seyfert";
import { InteractionResponseType, MessageFlags } from "seyfert/lib/types";

@Declare({
	name: "cry",
	description: "cry...",
})
@Cooldown({
	type: CooldownType.User,
	interval: 1000 * 15,
	uses: {
		default: 1,
	},
})
@Middlewares(["cooldown"])
export default class CryCommand extends Command {
	override async run(ctx: CommandContext) {
		const nekoResponse = await ctx.client.neko.fetch("cry", 1);
		const result = nekoResponse.results[0];

		if (!result) {
			return ctx.editOrReply({
				content: `Could not fetch cry GIF :<`,
			});
		}

		const embed = new Embed()
			.setColor("LuminousVividPink")
			.setTitle(
				`${ctx.author.globalName || ctx.author.username} cries...\(；′⌒\`\)`,
			)
			.setImage(result.url)
			.setFooter({ text: `Anime: ${result.anime_name || "N\A"}` });

		return await ctx.editOrReply({
			embeds: [embed],
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
		const inCooldown = context.client.cooldown.context(context);

		if (typeof inCooldown === "number") {
			setTimeout(async () => {
				await (response as WebhookMessage).delete();
			}, inCooldown);
		}
	}
}
