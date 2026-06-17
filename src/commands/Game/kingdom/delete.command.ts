import { ActionRow, Button, type CommandContext, Declare, Embed, SubCommand } from "seyfert";
import { ButtonStyle } from "seyfert/lib/types";
import { db } from "../../../db/db";
import { kingdoms } from "../../../db/schema";
import { eq } from "drizzle-orm";

@Declare({
    name: "delete",
    description: "Delete your kingdom forever"
})
export class DeleteCommand extends SubCommand {
    async run(ctx: CommandContext) {
        const userId = ctx.author.id;

        const kingdom = db
            .select()
            .from(kingdoms)
            .where(eq(kingdoms.userId, userId))
            .get();

        if (!kingdom) {
            const embed = new Embed()
                .setColor(0xFFB7C5)
                .setDescription("❌ You don't have a kingdom to delete~\nUse `/kingdom create` to start your journey! 🌸")
                .setFooter({ text: "✿ nothing to lose ✿" });

            return ctx.editOrReply({ embeds: [embed] });
        }

        const confirmButton = new Button()
            .setCustomId("kingdom_delete_confirm")
            .setLabel("Yes, delete it")
            .setStyle(ButtonStyle.Danger);

        const cancelButton = new Button()
            .setCustomId("kingdom_delete_cancel")
            .setLabel("No, keep it")
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRow<Button>().setComponents([confirmButton, cancelButton]);

        const warningEmbed = new Embed()
            .setColor(0xFF6B6B)
            .setTitle("⚠️ Are you sure?")
            .setDescription(
                `You are about to delete **${kingdom.name}** forever.\n\n` +
                "˚ ༘♡ ⋆｡˚  You will lose **everything** — your treasury, your locations, all of it~\n\n" +
                "This action **cannot** be undone."
            )
            .setFooter({ text: "✿ think carefully before you decide ✿" })
            .setTimestamp();

        const message = await ctx.write({ embeds: [warningEmbed], components: [row] }, true);

        const collector = message.createComponentCollector({
            filter: i => i.user.id === userId,
            idle:   30_000,
            onStop: async (reason) => {
                if (reason !== "idle") return;

                const expiredEmbed = new Embed()
                    .setColor(0xAAAAAA)
                    .setDescription("⏳ Deletion cancelled — you took too long to decide~")
                    .setFooter({ text: "✿ your kingdom is safe ✿" });

                await ctx.editOrReply({ embeds: [expiredEmbed], components: [] });
            },
        });

        collector.run("kingdom_delete_confirm", async (i) => {
            db.delete(kingdoms)
                .where(eq(kingdoms.userId, userId))
                .run();

            collector.stop("confirmed");

            const deletedEmbed = new Embed()
                .setColor(0xAAAAAA)
                .setTitle("🏚️ Kingdom Demolished")
                .setDescription(`**${kingdom.name}** has been erased from history...\n\n˚ ༘♡ ⋆｡˚  Whenever you're ready, you can always build anew~ 🌸`)
                .setFooter({ text: "✿ every ending is a new beginning ✿" })
                .setTimestamp();

            return i.update({ embeds: [deletedEmbed], components: [] });
        });

        collector.run("kingdom_delete_cancel", async (i) => {
            collector.stop("cancelled");

            const cancelEmbed = new Embed()
                .setColor(0xFFB7C5)
                .setTitle("🏰 Phew, that was close!")
                .setDescription(`**${kingdom.name}** is safe and sound~\n\n˚ ༘♡ ⋆｡˚  Your kingdom lives on! 🌸`)
                .setFooter({ text: "✿ keep growing your kingdom ✿" })
                .setTimestamp();

            return i.update({ embeds: [cancelEmbed], components: [] });
        });
    }
}