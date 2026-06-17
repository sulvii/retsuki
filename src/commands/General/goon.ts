import { Command, Declare, type CommandContext } from "seyfert";

@Declare({
	name: "goon",
	description: "Uh...",
})
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
