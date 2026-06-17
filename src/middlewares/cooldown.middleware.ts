import { createMiddleware, Formatter } from "seyfert";
import { TimestampStyle } from "seyfert/lib/common";
export const cooldown = createMiddleware<void>(
	async ({ context, next, stop }) => {
		// @ts-expect-error
		const inCooldown = context.client.cooldown.context(context);
		typeof inCooldown === "number"
			? stop(
					`You're in cooldown, try again ${Formatter.timestamp(new Date(Date.now() + inCooldown), TimestampStyle.RelativeTime)}`,
				)
			: next();
	},
);
