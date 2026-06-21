import {
	Command,
	Declare,
	Options,
	createStringOption,
	type CommandContext,
} from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { guilds } from "../../db/schema";

const options = {
	prefix: createStringOption({
		description: "The new prefix for this server",
		required: true,
	}),
};

@Declare({
	name: "setprefix",
	description: "Set the bot prefix for this server",
	defaultMemberPermissions: ["Administrator"],
})
@Options(options)
export default class SetPrefixCommand extends Command {
	override async run(ctx: CommandContext<typeof options>) {
		const newPrefix = ctx.options.prefix;

		if (newPrefix.length > 10) {
			return ctx.write({
				content: "❌ Prefix must be 10 characters or less!",
				flags: MessageFlags.Ephemeral,
			});
		}

		await ctx.client.db
			.insert(guilds)
			.values({
				guildId: ctx.guildId!,
				prefix: newPrefix,
				disabledPrefixes: "[]",
			})
			.onConflictDoUpdate({
				target: guilds.guildId,
				set: { prefix: newPrefix },
			});

		return ctx.write({
			content: `✅ Prefix updated to \`${newPrefix}\``,
			flags: MessageFlags.Ephemeral,
		});
	}
}
