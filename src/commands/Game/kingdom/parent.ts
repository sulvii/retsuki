import { Declare, Command, Options } from "seyfert";
import { CreateCommand } from "./create.command";
import { StatsCommand } from "./stats.command";
import { DeleteCommand } from "./delete.command";

@Declare({
	name: "kingdom",
	description: "kingdom command",
})
@Options([CreateCommand, StatsCommand, DeleteCommand])
export default class AccountCommand extends Command {}
