import "../watcher";
import {
	Client,
	type ParseClient,
	type ParseMiddlewares,
	type UsingClient,
} from "seyfert";
import { HandleCommand } from "seyfert/lib/commands/handle";
import { Yuna } from "yunaforseyfert";
import { db } from "./db/db";
import { guilds } from "./db/schema";
import { eq } from "drizzle-orm";
import { CooldownManager } from "@slipher/cooldown";
import { middlewares } from "./middlewares";

const DEFAULT_PREFIXES = ["retsuki", "rs", "r"];

const client = new Client({
	commands: {
		prefix: async (message) => {
			if (!message.guildId) return DEFAULT_PREFIXES;

			const guild = await db
				.select({
					prefix: guilds.prefix,
					disabledPrefixes: guilds.disabledPrefixes,
				})
				.from(guilds)
				.where(eq(guilds.guildId, message.guildId))
				.get();

			const disabledPrefixes = guild?.disabledPrefixes
				? (JSON.parse(guild.disabledPrefixes) as string[])
				: ([] as string[]);

			return [
				...new Set([...DEFAULT_PREFIXES, guild?.prefix ?? "retsuki"]),
			].filter((prefix) => !disabledPrefixes.includes(prefix));
		},
		reply: () => true,
	},
}) as UsingClient & Client;

class YunaHandler extends HandleCommand {
	override argsParser = Yuna.parser();
}

client.setServices({
	// Yuna handler- handles prefix commands with multiple formats.
	// retsuki help kingdom
	// retsukihelp kingdom
	// retsukihelp --command kingdom

	// Very flexible.
	handleCommand: YunaHandler,
	middlewares,
});

client.db = db;

process.on("unhandledRejection", (reason, promise) => {
	// ignore cooldown-related errors for slash commands
	if (
		Error.isError(reason) &&
		reason.message.includes("response.delete") &&
		reason.stack?.includes("inCooldown")
	)
		return;

	console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
	console.error("Uncaught Exception thrown:", error);
});

await client.start();

await client.uploadCommands({ cachePath: "./commands.json" });

// Initialize cooldown only once the client is ready because cooldown relies on Interaction/Message which is only available after client is ready.
// @ts-expect-error I asked seyfert team to fix it.
client.cooldown = new CooldownManager(client);

declare module "seyfert" {
	interface UsingClient extends ParseClient<Client<true>> {}
	interface RegisteredMiddlewares
		extends ParseMiddlewares<typeof middlewares> {}
	interface Client {
		db: typeof db;
		cooldown: CooldownManager;
	}
}
