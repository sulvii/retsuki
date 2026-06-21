import {
	type CommandContext,
	Declare,
	Embed,
	Middlewares,
	type OnOptionsReturnObject,
	Options,
	SubCommand,
	WebhookMessage,
	createStringOption,
} from "seyfert";
import { db } from "../../../db/db";
import { users, kingdoms, citizens } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
	generateLocation,
	LocationType,
	Regions,
	type Location,
} from "../../../db/data/locations";
import { CitizenRoles } from "../../../db/data/roles";
import { generateCitizenId } from "../../../db/utils";
import { Cooldown, CooldownType } from "@slipher/cooldown";
import { citizenRoleEmoji, citizenRoleLabel } from "./stats.command";
import { InteractionResponseType, MessageFlags } from "seyfert/lib/types";

const regionChoices = [
	{ name: "🏜️ Desert", value: String(Regions.Desert) },
	{ name: "🌊 Ocean", value: String(Regions.Ocean) },
	{ name: "🌾 Plain", value: String(Regions.Plain) },
	{ name: "🌲 Forest", value: String(Regions.Forest) },
	{ name: "❄️ Arctic", value: String(Regions.Arctic) },
	{ name: "🌼 Meadow", value: String(Regions.Meadow) },
	{ name: "🏔️ Valley", value: String(Regions.Valley) },
];

const options = {
	name: createStringOption({
		description: "The name of your kingdom",
		required: true,
		max_length: 32,
		min_length: 3,
	}),
	region: createStringOption({
		description: "The region your kingdom is settled in",
		required: true,
		choices: regionChoices,
	}),
};

const startingTypes: Record<Regions, [LocationType, LocationType]> = {
	[Regions.Desert]: [LocationType.Mine, LocationType.Market],
	[Regions.Ocean]: [LocationType.Harbor, LocationType.Market],
	[Regions.Plain]: [LocationType.Farm, LocationType.Market],
	[Regions.Forest]: [LocationType.Farm, LocationType.Mine],
	[Regions.Arctic]: [LocationType.Mine, LocationType.Fort],
	[Regions.Meadow]: [LocationType.Farm, LocationType.Market],
	[Regions.Valley]: [LocationType.Farm, LocationType.Mine],
};

const locationTypeEmoji: Record<LocationType, string> = {
	[LocationType.Capital]: "👑",
	[LocationType.Farm]: "🌿",
	[LocationType.Mine]: "⛏️",
	[LocationType.Market]: "🛒",
	[LocationType.Fort]: "🛡️",
	[LocationType.Harbor]: "⚓",
};

const locationTypeLabel: Record<LocationType, string> = {
	[LocationType.Capital]: "Capital",
	[LocationType.Farm]: "Farm",
	[LocationType.Mine]: "Mine",
	[LocationType.Market]: "Market",
	[LocationType.Fort]: "Fort",
	[LocationType.Harbor]: "Harbor",
};

const regionLabel: Record<Regions, string> = {
	[Regions.Desert]: "🏜️ Desert",
	[Regions.Ocean]: "🌊 Ocean",
	[Regions.Plain]: "🌾 Plain",
	[Regions.Forest]: "🌲 Forest",
	[Regions.Arctic]: "❄️ Arctic",
	[Regions.Meadow]: "🌼 Meadow",
	[Regions.Valley]: "🏔️ Valley",
};

// Maps a location type to the citizen role it spawns (if any)
const locationTypeToCitizenRole: Partial<Record<LocationType, CitizenRoles>> = {
	[LocationType.Mine]: CitizenRoles.Miner,
	[LocationType.Farm]: CitizenRoles.Farmer,
	[LocationType.Market]: CitizenRoles.Merchant,
	[LocationType.Harbor]: CitizenRoles.Merchant,
	[LocationType.Fort]: CitizenRoles.Warrior,
};

@Declare({
	name: "create",
	description: "Create a new kingdom",
})
@Cooldown({
	type: CooldownType.User,
	interval: 1000 * 15,
	uses: {
		default: 1,
	},
})
@Middlewares(["cooldown"])
@Options(options)
export class CreateCommand extends SubCommand {
	async run(ctx: CommandContext<typeof options>) {
		const userId = ctx.author.id;
		const { name, region: regionStr } = ctx.options;
		const region = Number(regionStr) as Regions;

		const existing = db
			.select()
			.from(kingdoms)
			.where(eq(kingdoms.userId, userId))
			.get();

		if (existing) {
			const embed = new Embed()
				.setColor(0xffb7c5)
				.setDescription(
					"❌ You already have a kingdom! Use `/kingdom stats` to view it~",
				)
				.setFooter({ text: "✿ one kingdom per ruler ✿" });

			return ctx.editOrReply({ embeds: [embed] });
		}

		const [typeA, typeB] = startingTypes[region];

		const startingLocations: (Location & { isLocked: boolean })[] = [
			{ ...generateLocation(region), type: typeA, isLocked: false },
			{ ...generateLocation(region), type: typeB, isLocked: false },
		];

		db.insert(users).values({ userId }).onConflictDoNothing().run();

		const kingdomId = randomUUID();

		db.insert(kingdoms)
			.values({
				kingdomId,
				name,
				revenue: 500,
				userId,
				region,
				locations: JSON.stringify(startingLocations),
			})
			.run();

		// Insert one starting citizen per location that has a mapped role
		const startingCitizens = [typeA, typeB].flatMap((locType) => {
			const role = locationTypeToCitizenRole[locType];
			if (role === undefined) return [];
			return [{ citizenId: generateCitizenId(), role, kingdomId }];
		});

		if (startingCitizens.length > 0) {
			db.insert(citizens).values(startingCitizens).run();
		}

		const displayName = ctx.guildId
			? (
					await (
						await ctx.client.guilds.fetch(ctx.guildId)
					).members.fetch(ctx.author.id)
				).displayName
			: ctx.author.username;

		const locationsValue = startingLocations
			.map(
				(l) =>
					`${locationTypeEmoji[l.type]} ${l.name} — ${locationTypeLabel[l.type]}`,
			)
			.join("\n");

		const citizensValue = startingCitizens
			.map((c) => `${citizenRoleEmoji[c.role]} ${citizenRoleLabel[c.role]}`)
			.join("\n");

		const embed = new Embed()
			.setColor(0xffb7c5)
			.setTitle(`🏰 ${name}`)
			.setDescription("˚ ༘♡ ⋆｡˚  your kingdom has been founded~")
			.addFields(
				{
					name: "👑 Ruler",
					value: displayName,
					inline: true,
				},
				{
					name: "🗺️ Region",
					value: regionLabel[region],
					inline: true,
				},
				{
					name: "🪙 Treasury",
					value: "500 coins",
					inline: true,
				},
				{
					name: "🏘️ Starting Locations",
					value: locationsValue,
					inline: false,
				},
				{
					name: `👥 Starting Citizens (${startingCitizens.length})`,
					value: citizensValue || "*none*",
					inline: false,
				},
			)
			.setFooter({ text: "✿ may your kingdom flourish ✿" })
			.setTimestamp();

		return ctx.editOrReply({ embeds: [embed] });
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

	override async onOptionsError(
		context: CommandContext,
		metadata: OnOptionsReturnObject,
	) {
		if (context.interaction) {
			await context.editOrReply({
				content: Object.entries(metadata)
					.filter((_) => _[1].failed)
					.map((error) => `${error[0]}: ${error[1].value}`)
					.join("\n"),
				flags: MessageFlags.Ephemeral,
			});
		}

		const reply = await context.editOrReply({
			content: Object.entries(metadata)
				.filter((_) => _[1].failed)
				.map((error) => `${error[0]}: ${error[1].value}`)
				.join("\n"),
		});

		setTimeout(async () => {
			await (reply as WebhookMessage).delete();
		}, 5000);
	}
}
