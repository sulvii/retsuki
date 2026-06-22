import { Command, type CommandContext, Declare, Embed } from "seyfert";
import { EmbedColors } from "seyfert/lib/common/index.js";

function formatUptime(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	const parts: string[] = [];
	if (days > 0) parts.push(`${days}d`);
	if (hours % 24 > 0) parts.push(`${hours % 24}h`);
	if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
	parts.push(`${seconds % 60}s`);

	return parts.join(" ");
}

const OWNER_ID = "1317508165776179261";

@Declare({
	name: "bot-info",
	description: "See everything about me under the hood! 🔍",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
export default class BotInfoCommand extends Command {
	public override async run(ctx: CommandContext): Promise<void> {
		const { client } = ctx;

		const ping = client.gateway.latency;
		const uptime = formatUptime(process.uptime() * 1000);

		const seyfertVersion = await getPackageVersion("seyfert");
		const bunVersion = Bun.version ?? "unknown";

		const owner = await client.users.fetch(OWNER_ID);

		const totalGuilds = (await client.cache.guilds?.count?.()) ?? "N/A";
		const totalUsers = (await client.cache.users?.count?.()) ?? "N/A";

		const embed = new Embed()
			.setColor(EmbedColors.Blurple)
			.setAuthor({
				name: `${client.me.username} — Bot Info`,
				iconUrl: client.me.avatarURL(),
			})
			.setThumbnail(client.me.avatarURL())
			.addFields(
				{
					name: "👑 Owner",
					value: owner ? `${owner.username}` : `<@${OWNER_ID}>`,
					inline: true,
				},
				{
					name: "🏓 Latency",
					value: `\`${ping}ms\``,
					inline: true,
				},
				{
					name: "⏱️ Uptime",
					value: `\`${uptime}\``,
					inline: true,
				},
				{
					name: "🏠 Guilds",
					value: `\`${totalGuilds}\``,
					inline: true,
				},
				{
					name: "👥 Users",
					value: `\`${totalUsers}\``,
					inline: true,
				},
				{
					name: "⚙️ Framework",
					value: `[Seyfert](https://seyfert.dev) \`v${seyfertVersion}\``,
					inline: true,
				},
				{
					name: "🥟 Bun",
					value: `\`v${bunVersion}\``,
					inline: true,
				},
				{
					name: "🟦 TypeScript",
					value: `\`v${await getPackageVersion("typescript")}\``,
					inline: true,
				},
				{
					name: "📦 Node Compat",
					value: `\`${process.version}\``,
					inline: true,
				},
				{
					name: "Original Character (OC) By",
					value: "`Jayashree`",
					inline: true,
				},
                {
                    name: "OC Name",
                    value: "`Retsuki`",
                    inline: true
                }
			)
			.setFooter({ text: `Shard ${ctx.shardId ?? 0}. Built with Seyfert. Framework for chads.` })
			.setTimestamp();

		await ctx.write({ embeds: [embed] });
	}
}

async function getPackageVersion(pkg: string): Promise<string> {
	try {
		const mod = (await import(`${pkg}/package.json`, {
			with: { type: "json" },
		})) as { default: { version: string } };
		return mod.default.version;
	} catch {
		return "unknown";
	}
}
