import { type CommandContext, Declare, Embed, SubCommand } from "seyfert";
import { Formatter } from "seyfert";
import { TimestampStyle } from "seyfert/lib/common";
import { db } from "../../../db/db";
import { kingdoms } from "../../../db/schema";
import { eq } from "drizzle-orm";

@Declare({
    name: "stats",
    description: "View stats of your kingdom!"
})
export class StatsCommand extends SubCommand {
    async run(ctx: CommandContext) {
        const userId = ctx.author.id;

        const kingdom = db
            .select()
            .from(kingdoms)
            .where(eq(kingdoms.userId, userId))
            .get();

        if (!kingdom) {
            const noKingdomEmbed = new Embed()
                .setColor(0xFFB7C5)
                .setDescription("✦ ˚｡ You don't have a kingdom yet!\nUse `/kingdom create` to start your journey~ 🌸")
                .setFooter({ text: "✿ your adventure awaits ✿" });

            return ctx.editOrReply({ embeds: [noKingdomEmbed] });
        }

        const lastClaimed    = new Date(kingdom.lastDailyClaimed);
        const neverClaimed   = kingdom.lastDailyClaimed === 0;
        const nextClaimTime  = new Date(lastClaimed.getTime() + 24 * 60 * 60 * 1000);
        const canClaimNow    = neverClaimed || Date.now() >= nextClaimTime.getTime();

        const dailyStatus = neverClaimed
            ? "✅ Ready to claim!"
            : canClaimNow
                ? "✅ Ready to claim!"
                : `⏳ ${Formatter.timestamp(nextClaimTime, TimestampStyle.RelativeTime)}`;

        const embed = new Embed()
            .setColor(0xFFB7C5)
            .setAuthor({ name: `${ctx.author.username}'s Kingdom` })
            .setTitle(`🏰 ${kingdom.name}`)
            .setDescription("˚ ༘♡ ⋆｡˚  here's how your little kingdom is doing~")
            .addFields(
                {
                    name: "🪙 Treasury",
                    value: Formatter.bold(`${Number(kingdom.revenue).toLocaleString()} coins`),
                    inline: true,
                },
                {
                    name: "🌸 Daily Reward",
                    value: dailyStatus,
                    inline: true,
                },
                {
                    name: "📅 Kingdom Founded",
                    value: neverClaimed
                        ? "Just now~"
                        : Formatter.timestamp(lastClaimed, TimestampStyle.LongDate),
                    inline: true,
                },
            )
            .setFooter({ text: "✿ keep growing your kingdom ✿" })
            .setTimestamp();

        return ctx.editOrReply({ embeds: [embed] });
    }
}