import { Cooldown, CooldownType } from "@slipher/cooldown";
import { Command, Declare, Middlewares, type CommandContext } from "seyfert";

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
}
