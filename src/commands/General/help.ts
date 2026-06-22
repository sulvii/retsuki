import {
	ActionRow,
	type AutocompleteInteraction,
	Command,
	type CommandContext,
	ContextMenuCommand,
	createStringOption,
	Declare,
	Embed,
	Options,
	StringSelectMenu,
	StringSelectOption,
	SubCommand,
} from "seyfert";
import { EmbedColors } from "seyfert/lib/common/index.js";
import type {
	APIApplicationCommandOption,
	ApplicationCommandOptionType,
} from "seyfert/lib/types/index.js";
import { MessageFlags } from "seyfert/lib/types/index.js";

const optionTypeNames: Record<ApplicationCommandOptionType, string> = {
	1: "Subcommand",
	2: "SubcommandGroup",
	3: "String",
	4: "Integer",
	5: "Boolean",
	6: "User",
	7: "Channel",
	8: "Role",
	9: "Mentionable",
	10: "Number",
	11: "Attachment",
};

function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

function extractCategory(cmd: Command | ContextMenuCommand): string {
	const filePath = cmd.__filePath;
	if (typeof filePath !== "string") return "Misc";

	const parts = filePath.replace(/\\/g, "/").split("/");
	const cmdIndex = parts.lastIndexOf("commands");
	return capitalize(parts[cmdIndex + 1] ?? "Misc");
}

const options = {
	command: createStringOption({
		description: "The command you want help with.",
		required: false,
		async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
			const { client } = interaction;
			const commands = client.commands.values.filter((cmd) => !cmd.guildId);
			const input = interaction.getInput().toLowerCase();

			const filtered = commands
				.filter((cmd) => cmd.name.toLowerCase().includes(input))
				.slice(0, 25);

			return interaction.respond(
				filtered.map((cmd) => ({
					name: `${cmd.name} — ${cmd.description.slice(0, 80)}`,
					value: cmd.name,
				})),
			);
		},
	}),
};

@Declare({
	name: "help",
	description: "Shows you everything I can do! 💫",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class HelpCommand extends Command {
	public override async run(
		ctx: CommandContext<typeof options>,
	): Promise<void> {
		const { client, options } = ctx;

		const commands = client.commands.values.filter((cmd) => !cmd.guildId);

		if (options.command) {
			const found = commands.find((cmd) => cmd.name === options.command);

			if (!found) {
				await ctx.write({
					flags: MessageFlags.Ephemeral,
					embeds: [
						new Embed()
							.setColor(EmbedColors.Red)
							.setDescription(
								`Couldn't find a command called \`${options.command}\`, sowwy! 🥲`,
							),
					],
				});
				return;
			}

			await ctx.write({
				embeds: [buildCommandEmbed(found, client.me.username)],
			});
			return;
		}

		const grouped = new Map<string, Array<Command | ContextMenuCommand>>();

		for (const cmd of commands) {
			const category = extractCategory(cmd);
			if (!grouped.has(category)) grouped.set(category, []);
			grouped.get(category)!.push(cmd);
		}

		const sortedCategories = [...grouped.keys()].sort();

		const categoryMenuOptions = sortedCategories.slice(0, 25).map((cat) =>
			new StringSelectOption()
				.setLabel(cat)
				.setValue(`cat:${cat}`)
				.setDescription(
					`${grouped.get(cat)!.length} command(s) — click to explore~`,
				),
		);

		const categoryRow = new ActionRow<StringSelectMenu>().addComponents(
			new StringSelectMenu()
				.setCustomId("help-category")
				.setPlaceholder("Pick a category~")
				.setOptions(categoryMenuOptions),
		);

		const overviewDescription =
			sortedCategories
				.map((cat) => {
					const cmds = grouped.get(cat)!;
					return `**${cat}**\n${cmds.map((c) => `\`${c.name}\``).join(", ")}`;
				})
				.join("\n\n") || "I have no commands yet... how sad. 😢";

		const message = await ctx.write(
			{
				embeds: [
					new Embed()
						.setColor(EmbedColors.Blurple)
						.setThumbnail(ctx.author.avatarURL())
						.setTitle(`✨ ${client.me.username}'s Commands ✨`)
						.setDescription(overviewDescription)
						.setFooter({ text: "Pick a category below to learn more~" }),
				],
				components: [categoryRow],
			},
			true,
		);

		const collector = message.createComponentCollector({
			filter: (i) => i.user.id === ctx.author.id && i.isStringSelectMenu(),
			idle: 30_000,
		});

		collector.run("help-category", async (i) => {
			if (!i.isStringSelectMenu()) return;

			const value = i.values[0];
			if (!value?.startsWith("cat:")) return;

			const cat = value.slice(4);
			const cmds = grouped.get(cat);

			if (!cmds?.length) {
				return i.write({
					content: "Hmm, that category vanished! 👻",
					flags: MessageFlags.Ephemeral,
				});
			}

			const commandMenuOptions = cmds
				.slice(0, 25)
				.map((cmd) =>
					new StringSelectOption()
						.setLabel(cmd.name)
						.setValue(cmd.name)
						.setDescription(cmd.description.slice(0, 100)),
				);

			const commandRow = new ActionRow<StringSelectMenu>().addComponents(
				new StringSelectMenu()
					.setCustomId("help-command")
					.setPlaceholder("Pick a command, hehe~")
					.setOptions(commandMenuOptions),
			);

			await i.update({
				embeds: [
					new Embed()
						.setColor(EmbedColors.Blurple)
						.setTitle(`✨ ${cat} Commands`)
						.setDescription(
							cmds
								.map((cmd) => `\`${cmd.name}\` — ${cmd.description}`)
								.join("\n"),
						)
						.setFooter({ text: "Pick a command to see its details~" }),
				],
				components: [categoryRow, commandRow],
			});
		});

		collector.run("help-command", async (i) => {
			if (!i.isStringSelectMenu()) return;

			const picked = commands.find((cmd) => cmd.name === i.values[0]);
			if (!picked) {
				return i.write({
					content: "Hmm, that command vanished! 👻",
					flags: MessageFlags.Ephemeral,
				});
			}

			await i.update({
				embeds: [buildCommandEmbed(picked, client.me.username)],
				components: [categoryRow],
			});
		});
	}
}

function buildCommandEmbed(
	command: Command | ContextMenuCommand,
	clientName: string,
): Embed {
	if (command instanceof ContextMenuCommand) {
		return new Embed()
			.setColor(EmbedColors.Blurple)
			.setTitle(`${clientName} → ${command.name}`)
			.setDescription(
				"This is a context menu command, it doesn't take any options!",
			);
	}

	const hasSubCommands =
		command.options?.some((o) => o instanceof SubCommand) ?? false;

	let content: string;
	if (hasSubCommands) {
		const lines = (command.options ?? [])
			.filter((o): o is SubCommand => o instanceof SubCommand)
			.map((sub) => parseSubCommand(sub));
		content = `\`${command.name}\`\n${lines.join("\n")}`;
	} else {
		const args = (command.options ?? [])
			.map((o) => `<${(o as APIApplicationCommandOption).name}>`)
			.join(" ");
		content = `\`${command.name}${args ? ` ${args}` : ""}\``;
	}

	return new Embed()
		.setColor(EmbedColors.Blurple)
		.setTitle(`${clientName} → ${command.name}`)
		.setDescription(`${content}\n\n${command.description}`);
}

function parseSubCommand(subCommand: SubCommand): string {
	if (!subCommand.options?.length) return `↪ \`${subCommand.name}\``;

	const opts = (subCommand.options as APIApplicationCommandOption[])
		.map((o) => `<${o.name}:${optionTypeNames[o.type]}>`)
		.join(" ");

	return `↪ \`${subCommand.name} ${opts}\``;
}
