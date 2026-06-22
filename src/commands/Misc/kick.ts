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

const options = {
	user: createUserOption({
		description: "The person you want to kick into next week 🦵",
		required: true,
	}),
};

const KICK_TITLES = [
	(kicker: string, target: string) =>
		`${kicker} delivers a flying kick to ${target}!! Bam!! They're seeing stars!! ⭐`,
	(kicker: string, target: string) =>
		`${kicker} boot-launched ${target} into the stratosphere!! 🚀 Farewell!!`,
	(kicker: string, target: string) =>
		`${kicker} roundhouse kicked ${target} right in the ego!! 🦵💥 Brutal!!`,
	(kicker: string, target: string) =>
		`${kicker} sent ${target} flying with a powerful kick!! They might be in orbit now!! 🌕`,
	(kicker: string, target: string) =>
		`${kicker} YEET-kicked ${target} across the server!! 😤💢 No mercy!!`,
	(kicker: string, target: string) =>
		`${kicker} did a spinning heel kick on ${target}!! They didn't see it coming!! 🌀`,
] as const;

@Declare({
	name: "kick",
	description: "Boot someone into the next dimension (ง'̀-'́)ง",
})
@Cooldown({
	type: CooldownType.User,
	interval: 1000 * 15,
	uses: {
		default: 1,
	},
})
@Options(options)
@Middlewares(["cooldown"])
export default class KickCommand extends Command {
	override async run(ctx: CommandContext<typeof options>) {
		const { user } = ctx.options;

		const nekoResponse = await ctx.client.neko.fetch("kick", 1);
		const result = nekoResponse.results[0];

		if (!result) {
			return ctx.editOrReply({
				content: `Couldn't fetch a kick GIF... my leg is tired :<`,
			});
		}

		const randomTitle = KICK_TITLES[
			Math.floor(Math.random() * KICK_TITLES.length)
		] as (kicker: string, target: string) => string;

		const kicker = ctx.author.globalName ?? ctx.author.username;
		const target = user.globalName ?? user.username;

		const embed = new Embed()
			.setColor("LuminousVividPink")
			.setTitle(randomTitle(kicker, target) as string)
			.setImage(result.url)
			.setFooter({ text: `Anime: ${result.anime_name ?? "N/A"}` });

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
