import {
	Command,
	Declare,
	Options,
	createStringOption,
	type CommandContext,
} from "seyfert";
import { eq } from "drizzle-orm";
import { db } from "../../db/db";
import { kingdoms, armory } from "../../db/schema";

const MAX_TIER = 5;
const tierCost = (tier: number) => 500 * (tier + 1);

const options = {
	role: createStringOption({
		description: "Which troop type to upgrade weapons for",
		required: true,
		choices: [
			{ name: "⚔️ Warrior", value: "warrior" },
			{ name: "🏹 Archer", value: "archer" },
			{ name: "🐎 Knight", value: "knight" },
		] as const,
	}),
};

@Declare({ name: "armory", description: "Upgrade your army's weapons" })
@Options(options)
export default class ArmoryCommand extends Command {
	override async run(ctx: CommandContext<typeof options>) {
		const userId = ctx.author.id;
		const role = ctx.options.role;

		const kingdom = db
			.select()
			.from(kingdoms)
			.where(eq(kingdoms.userId, userId))
			.get();
		if (!kingdom)
			return ctx.editOrReply({ content: "❌ You don't have a kingdom yet!" });

		let a = db
			.select()
			.from(armory)
			.where(eq(armory.kingdomId, kingdom.kingdomId))
			.get();
		if (!a) {
			db.insert(armory).values({ kingdomId: kingdom.kingdomId }).run();
			a = db
				.select()
				.from(armory)
				.where(eq(armory.kingdomId, kingdom.kingdomId))
				.get()!;
		}

		const tierKey = `${role}Tier` as
			| "warriorTier"
			| "archerTier"
			| "knightTier";
		const currentTier = a[tierKey];

		if (currentTier >= MAX_TIER) {
			return ctx.editOrReply({
				content: `❌ Your ${role} weapons are already max tier (${MAX_TIER}).`,
			});
		}

		const cost = tierCost(currentTier);
		if (Number(kingdom.revenue) < cost) {
			return ctx.editOrReply({
				content: `❌ Upgrading ${role} weapons to tier ${currentTier + 1} costs **${cost}** coins. You have **${Math.floor(Number(kingdom.revenue))}**.`,
			});
		}

		db.update(kingdoms)
			.set({ revenue: Number(kingdom.revenue) - cost })
			.where(eq(kingdoms.userId, userId))
			.run();
		db.update(armory)
			.set({ [tierKey]: currentTier + 1 })
			.where(eq(armory.kingdomId, kingdom.kingdomId))
			.run();

		return ctx.editOrReply({
			content: `✅ Upgraded **${role}** weapons to **Tier ${currentTier + 1}**! Every ${role} you own now hits harder.`,
		});
	}
}
