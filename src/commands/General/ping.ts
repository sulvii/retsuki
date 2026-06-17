import {
    Client,
  Command,
  Declare,
  Options,
  createBooleanOption,
  type CommandContext
} from 'seyfert';
import { MessageFlags } from 'seyfert/lib/types';

const options = {
  hide: createBooleanOption({
    description: "Hide the command's response",
  }),
};

@Declare({
  name: 'ping',
  description: 'Show latency with Discord'
})
@Options(options)
export default class PingCommand extends Command {

  override async run(ctx: CommandContext<typeof options>) {
    const flags = ctx.options.hide ? MessageFlags.Ephemeral : undefined;
    
    const ping = (ctx.client as Client).gateway.latency;

    await ctx.write({
      content: `The latency is \`${ping}\``,
      flags,
    });
  }
}