import { Declare, Command, Options } from "seyfert";
import { CreateCommand } from "./create.command";
import { StatsCommand } from "./stats.command";

@Declare({
	name: "kingdom",
	description: "kingdom command"
})
@Options([CreateCommand, StatsCommand])
export default class AccountCommand extends Command {}