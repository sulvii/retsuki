import "../watcher";
import { Client, type ParseClient, type UsingClient } from "seyfert";
import { HandleCommand } from "seyfert/lib/commands/handle";
import { Yuna } from "yunaforseyfert";
import { db } from "./db/db";
import { guilds } from "./db/schema";
import { eq } from "drizzle-orm";
import { CooldownManager } from "@slipher/cooldown";

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
});

client.db = db;

await client.start();

client.uploadCommands({ cachePath: "./commands.json" });

// @ts-expect-error I asked seyfert team to fix it.
client.cooldown = new CooldownManager(client);

declare module "seyfert" {
	interface UsingClient extends ParseClient<Client<true>> {}
	interface Client {
		db: typeof db;
		cooldown: CooldownManager;
	}
}
