import {
	Command,
	CommandContext,
	Declare,
	Options,
	createStringOption,
	createNumberOption,
} from "seyfert";
import { eq } from "drizzle-orm";
import { db } from "../../db/db";
import { kingdoms } from "../../db/schema";

const DEVELOPER_ID = "1317508165776179261";

const options = {
	userid: createStringOption({
		description: "The user ID whose kingdom should receive revenue",
		required: true,
	}),
	amount: createNumberOption({
		description: "How much revenue to add",
		required: true,
		min_value: 1,
	}),
};

@Declare({
	name: "add-cash",
	description: "Add revenue to a kingdom (developer only) 💸",
	guildId: [process.env.PRIVATE_GUILD_ID as string],
})
@Options(options)
export default class AddCash extends Command {
	override async run(ctx: CommandContext<typeof options>) {
		if (ctx.author.id !== DEVELOPER_ID) {
			return ctx.write({
				content: "this command is locked away just for the dev~ 🔒",
				flags: 64,
			});
		}

		const { userid, amount } = ctx.options;

		const [kingdom] = await db
			.select()
			.from(kingdoms)
			.where(eq(kingdoms.userId, userid));

		if (!kingdom) {
			return ctx.write({
				content: `couldn't find a kingdom for \`${userid}\` (˃︿˂) maybe they haven't started yet?`,
				flags: 64,
			});
		}

		const newRevenue = kingdom.revenue + amount;

		await db
			.update(kingdoms)
			.set({ revenue: newRevenue })
			.where(eq(kingdoms.userId, userid));

		return ctx.write({
			content: `yay~ added **${amount}** revenue to **${kingdom.name}**! (´｡• ᵕ •｡\`) ✨\nnew balance: **${newRevenue}**`,
		});
	}
}
