import { type CommandContext, Declare, Embed, Options, SubCommand, createStringOption } from "seyfert";
import { db } from "../../../db/db";
import { users, kingdoms } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const options = {
	name: createStringOption({
		description: "The name of your kingdom",
		required: true,
		max_length: 32,
		min_length: 3,
	}),
};

@Declare({
	name: "create",
	description: "Create a new kingdom"
})
@Options(options)
export class CreateCommand extends SubCommand {
	async run(ctx: CommandContext<typeof options>) {
		const userId = ctx.author.id;
		const { name } = ctx.options;

		const existing = db
			.select()
			.from(kingdoms)
			.where(eq(kingdoms.userId, userId))
			.get();

		if (existing) {
			return ctx.editOrReply({
				content: "❌ You already have a kingdom!"
			});
		}

		db.insert(users)
			.values({ userId })
			.onConflictDoNothing()
			.run();

		db.insert(kingdoms)
			.values({
				kingdomId: randomUUID(),
				name,
				revenue:   0,
				userId,
			})
			.run();

            const embed = new Embed();

            embed.setTitle(`✅ Your kingdom **${name}** has been created!`).addFields({
                name: 'Name',
                value: name,
                inline: true,
            }, {
                name: 'Revenue',
                value: "0",
                inline: true
            }, {
                name: 'King',
                value: ctx.guildId ? (await (await ctx.client.guilds.fetch(ctx.guildId)).members.fetch(ctx.author.id)).displayName : 'N/A'
            }).setTimestamp().setColor('Green');

		return ctx.editOrReply({
			embeds: [embed]
		});
	}
}