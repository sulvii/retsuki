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

const client = new Client({
	commands: {
		prefix: async (message) => {
			if (!message.guildId) return ["retsuki", "rs"];

			const guild = await db
				.select({ prefix: guilds.prefix })
				.from(guilds)
				.where(eq(guilds.guildId, message.guildId))
				.get();

			return ["retsuki", "rs", guild?.prefix ?? "retsuki"];
		},
		reply: () => true,
	},
}) as UsingClient & Client;

class YunaHandler extends HandleCommand {
	override argsParser = Yuna.parser();
}

client.setServices({
	handleCommand: YunaHandler,
	middlewares,
});

client.db = db;

process.on("unhandledRejection", (reason, promise) => {
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

await client.start().then(() => {
	client.uploadCommands({ cachePath: "./commands.json" });

	// @ts-expect-error I asked seyfert team to fix it.
	client.cooldown = new CooldownManager(client);
});
declare module "seyfert" {
	interface UsingClient extends ParseClient<Client<true>> {}
	interface RegisteredMiddlewares
		extends ParseMiddlewares<typeof middlewares> {} // add this
	interface Client {
		db: typeof db;
		cooldown: CooldownManager;
	}
}
