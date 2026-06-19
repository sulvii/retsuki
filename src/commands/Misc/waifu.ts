import { Cooldown, CooldownType } from "@slipher/cooldown";
import {
	AutocompleteInteraction,
	Command,
	createStringOption,
	Declare,
	Embed,
	Middlewares,
	Options,
	TextGuildChannel,
	WebhookMessage,
	type CommandContext,
} from "seyfert";
import ky from "ky";
import {
	ChannelType,
	InteractionResponseType,
	MessageFlags,
} from "seyfert/lib/types";
import type { ColorResolvable } from "seyfert/lib/common";

const waifuClient = ky.create({
	prefix: "https://api.waifu.im",
});

export interface WaifuImArtist {
	id: number;
	name: string;
	patreon: string | null;
	pixiv: string | null;
	twitter: string | null;
	deviantArt: string | null;
	reviewStatus: "Accepted" | "Pending" | "Rejected";
	creatorId: number | null;
	imageCount: number;
}

export interface WaifuImTag {
	id: number;
	name: string;
	slug: string;
	description: string;
	reviewStatus: "Accepted" | "Pending" | "Rejected";
	creatorId: number | null;
	imageCount: number;
}

export interface WaifuImImage {
	id: number;
	perceptualHash: string;
	extension: string;
	dominantColor: string;
	source: string;
	artists: WaifuImArtist[];
	uploaderId: number | null;
	uploadedAt: string;
	isNsfw: boolean;
	isAnimated: boolean;
	width: number;
	height: number;
	byteSize: number;
	url: string;
	tags: WaifuImTag[];
	reviewStatus: string;
	favorites: number;
	likedAt: string | null;
	addedToAlbumAt: string | null;
	albums: unknown[];
}

export interface WaifuImResponse {
	items: WaifuImImage[];
	pageNumber: number;
	totalPages: number;
	totalCount: number;
	hasPreviousPage: boolean;
	hasNextPage: boolean;
	maxPageSize: number;
	defaultPageSize: number;
}

async function tagsAutocomplete(interaction: AutocompleteInteraction) {
	const response = await waifuClient.get("tags").json<{
		items: Array<{
			name: string;
			slug: string;
		}>;
	}>();

	const focus = interaction.getInput();

	return interaction.respond(
		response.items
			.filter((item) => item.name.includes(focus))
			.map(({ name, slug }) => ({ name, value: slug })),
	);
}

const options = {
	included_tag: createStringOption({
		description: "Primary tag to include (autocomplete)",
		autocomplete: tagsAutocomplete,
		required: false,
	}),
	included_tags: createStringOption({
		description:
			"Additional tags to include, comma-separated (e.g. maid,uniform)",
		max_length: 200,
		required: false,
	}),
	excluded_tag: createStringOption({
		description: "Primary tag to exclude (autocomplete)",
		autocomplete: tagsAutocomplete,
		required: false,
	}),
	excluded_tags: createStringOption({
		description:
			"Additional tags to exclude, comma-separated (e.g. maid,uniform)",
		max_length: 200,
		required: false,
	}),
	nsfw: createStringOption({
		description: "should the result include nsfw?",
		choices: [
			{
				name: "Yes",
				value: "True",
			},
			{
				name: "No",
				value: "False",
			},
			{
				name: "Include all",
				value: "All",
			},
		],
	}),
};
@Declare({
	name: "waifu",
	description: "View waifu images!",
})
@Cooldown({
	type: CooldownType.User,
	interval: 1000 * 15,
	uses: {
		default: 1,
	},
})
@Options(options)
@Middlewares(["cooldown"])
export default class WaifuCommand extends Command {
	override async run(ctx: CommandContext<typeof options>) {
		const {
			included_tag: includedTag,
			included_tags: includedTags,
			excluded_tag: excludedTag,
			excluded_tags: excludedTags,
			nsfw,
		} = ctx.options;

		const included = [
			...(includedTag ? [includedTag] : []),
			...(includedTags
				?.split(",")
				.map((t) => t.trim())
				.filter(Boolean) ?? []),
		];

		const excluded = [
			...(excludedTag ? [excludedTag] : []),
			...(excludedTags
				?.split(",")
				.map((t) => t.trim())
				.filter(Boolean) ?? []),
		];

		const searchParams = new URLSearchParams();
		included.forEach((tag) => searchParams.append("included_tags", tag));
		excluded.forEach((tag) => searchParams.append("excluded_tags", tag));
		searchParams.append("PageSize", "1");
		searchParams.append("IsNsfw", nsfw ?? "All");

		const response = await waifuClient
			.get(`images?${searchParams}`)
			.json<WaifuImResponse>();

		const channel = await ctx.client.channels.fetch(ctx.channelId);

		const channelIsNsfw =
			channel.type === ChannelType.GuildText &&
			(channel as TextGuildChannel).nsfw === true;

		const requestedNsfw = nsfw === "True" || nsfw === "All";
		const responseHasNsfw = response.items.some((item) => item.isNsfw);

		const requiresNsfwChannel = requestedNsfw || responseHasNsfw;

		if (requiresNsfwChannel && !channelIsNsfw) {
			return ctx.write({
				embeds: [
					new Embed()
						.setColor("Red")
						.setTitle("🔞 NSFW Image!")
						.setDescription("Please run this in an age-restricted channel :p"),
				],
			});
		}

		const item = response.items[0];

		if (!item) {
			return ctx.write({
				content: `Could not find the image for tags: \`${included.join(", ")}\` and excluded tags: \`${excluded.join(", ")}\``,
			});
		}

		return ctx.write({
			embeds: [
				new Embed()
					.setColor(
						(item.dominantColor as ColorResolvable) || "LuminousVividPink",
					)
					.setTitle("Found image :>")
					.setAuthor({
						name: item.artists.map((artist) => artist.name).join(", "),
					})
					.setImage(item.url)
					.setTimestamp()
					.setURL(item.source),
			],
		});
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
		// @ts-expect-error
		const inCooldown = context.client.cooldown.context(context);

		if (typeof inCooldown === "number") {
			setTimeout(async () => {
				await (response as WebhookMessage).delete();
			}, inCooldown);
		}
	}
}
