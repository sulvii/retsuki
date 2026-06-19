import { Cooldown, CooldownType } from "@slipher/cooldown";
import {
	Command,
	Declare,
	Middlewares,
	WebhookMessage,
	type CommandContext,
} from "seyfert";

@Declare({
	name: "fih",
	description: "Fih you say...",
})
@Cooldown({
	type: CooldownType.User,
	interval: 1000 * 15,
	uses: {
		default: 1,
	},
})
@Middlewares(["cooldown"])
export default class FihCommand extends Command {
	override async run(ctx: CommandContext) {
		const fihImage =
			"https://media.discordapp.net/attachments/771635439345991691/1491043319957164155/fv55b4n.gif?ex=6a2ded8d&is=6a2c9c0d&hm=e9c4ea6a27ad5fda1d12caaf67a336fa73fe8bc98260b4ee3546594f27fc9798&=&width=400&height=266";

		await ctx.write({ content: fihImage });
	}

	override async onMiddlewaresError(context: CommandContext, error: string) {
		try {
			const reply = await context.editOrReply({ content: error });

			// @ts-expect-error
			const inCooldown = context.client.cooldown.context(context);

			if (typeof inCooldown === "number") {
				setTimeout(async () => {
					await (reply as WebhookMessage).delete();
				}, inCooldown);
			}
		} catch (error) {
			return;
		}
	}
}
