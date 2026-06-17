import { type CommandContext, Declare, Embed, SubCommand } from "seyfert";
import { Formatter } from "seyfert";
import { TimestampStyle } from "seyfert/lib/common";
import { db } from "../../../db/db";
import { kingdoms } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { Regions, LocationType, type Location } from "../../../db/data/locations";

const regionEmoji: Record<Regions, string> = {
    [Regions.Desert]: "🏜️",
    [Regions.Ocean]:  "🌊",
    [Regions.Plain]:  "🌾",
    [Regions.Forest]: "🌲",
    [Regions.Arctic]: "❄️",
    [Regions.Meadow]: "🌼",
    [Regions.Valley]: "🏔️",
};

const regionLabel: Record<Regions, string> = {
    [Regions.Desert]: "Desert",
    [Regions.Ocean]:  "Ocean",
    [Regions.Plain]:  "Plain",
    [Regions.Forest]: "Forest",
    [Regions.Arctic]: "Arctic",
    [Regions.Meadow]: "Meadow",
    [Regions.Valley]: "Valley",
};

const locationTypeEmoji: Record<LocationType, string> = {
    [LocationType.Capital]: "👑",
    [LocationType.Farm]:    "🌿",
    [LocationType.Mine]:    "⛏️",
    [LocationType.Market]:  "🛒",
    [LocationType.Fort]:    "🛡️",
    [LocationType.Harbor]:  "⚓",
};

const locationTypeLabel: Record<LocationType, string> = {
    [LocationType.Capital]: "Capital",
    [LocationType.Farm]:    "Farm",
    [LocationType.Mine]:    "Mine",
    [LocationType.Market]:  "Market",
    [LocationType.Fort]:    "Fort",
    [LocationType.Harbor]:  "Harbor",
};

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

        const lastClaimed   = new Date(kingdom.lastDailyClaimed);
        const neverClaimed  = kingdom.lastDailyClaimed === 0;
        const nextClaimTime = new Date(lastClaimed.getTime() + 24 * 60 * 60 * 1000);
        const canClaimNow   = neverClaimed || Date.now() >= nextClaimTime.getTime();

        const dailyStatus = canClaimNow
            ? "✅ Ready to claim!"
            : `⏳ ${Formatter.timestamp(nextClaimTime, TimestampStyle.RelativeTime)}`;

        const region      = kingdom.region as Regions;
        const regionField = `${regionEmoji[region]} ${regionLabel[region]}`;

        const locations: Location[] = JSON.parse(kingdom.locations);
        const locationsField = locations.length === 0
            ? "*No locations yet~*"
            : locations
                .map(l => `${locationTypeEmoji[l.type]} ${l.name} — ${locationTypeLabel[l.type]}`)
                .join("\n");

        const embed = new Embed()
            .setColor(0xFFB7C5)
            .setAuthor({ name: `${ctx.author.username}'s Kingdom` })
            .setTitle(`🏰 ${kingdom.name}`)
            .setDescription("˚ ༘♡ ⋆｡˚  here's how your little kingdom is doing~")
            .addFields(
                {
                    name:   "🪙 Treasury",
                    value:  Formatter.bold(`${kingdom.revenue.toLocaleString()} coins`),
                    inline: true,
                },
                {
                    name:   "🗺️ Region",
                    value:  regionField,
                    inline: true,
                },
                {
                    name:   "🌸 Daily Reward",
                    value:  dailyStatus,
                    inline: true,
                },
                {
                    name:   `🏘️ Locations (${locations.length})`,
                    value:  locationsField,
                    inline: false,
                },
            )
            .setFooter({ text: "✿ keep growing your kingdom ✿" })
            .setTimestamp();

        return ctx.editOrReply({ embeds: [embed] });
    }
}