import { Client, ClientUser, createEvent } from "seyfert";
import { ActivityType, PresenceUpdateStatus } from "seyfert/lib/types";

export default createEvent({
	data: { once: true, name: "botReady" },
	run(user, client) {
		client.logger.info(`${user.username} is ready`);

		(client as Client).gateway.setPresence({
			status: PresenceUpdateStatus.DoNotDisturb,
			activities: [
				{
					name: "Playing with You",
					type: ActivityType.Playing,
				},
			],
			since: 0,
			afk: false,
		});
	},
});
