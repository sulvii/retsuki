import { Cooldown, CooldownType } from "@slipher/cooldown";
import {
	Command,
	Declare,
	Embed,
	Middlewares,
	WebhookMessage,
	type CommandContext,
} from "seyfert";
import { InteractionResponseType, MessageFlags } from "seyfert/lib/types";
import { chooseFrom } from "../../utils/random";

@Declare({
	name: "sip",
	description: "Sips",
})
@Cooldown({
	type: CooldownType.User,
	interval: 1000 * 15,
	uses: {
		default: 1,
	},
})
@Middlewares(["cooldown"])
export default class SipCommand extends Command {
	override async run(ctx: CommandContext) {
		const nekoResponse = await ctx.client.neko.fetch("sip", 1);
		const result = nekoResponse.results[0];

		if (!result) {
			return ctx.editOrReply({
				content: `Could not fetch sip GIF :<`,
			});
		}

		const sips = ["boba", "water", "matcha", "caramel latte", "coffee", "tea"];
		const randomSip = chooseFrom(...sips);

		const embed = new Embed()
			.setColor("LuminousVividPink")
			.setTitle(
				`${ctx.author.globalName || ctx.author.username} sips ${randomSip}`,
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
