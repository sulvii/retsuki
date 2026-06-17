import {
  Command,
  Declare,
  type CommandContext
} from 'seyfert';

@Declare({
  name: 'fih',
  description: 'Fih you say...'
})
export default class PingCommand extends Command {

  override async run(ctx: CommandContext) {    ;
    const fihImage = 'https://media.discordapp.net/attachments/771635439345991691/1491043319957164155/fv55b4n.gif?ex=6a2ded8d&is=6a2c9c0d&hm=e9c4ea6a27ad5fda1d12caaf67a336fa73fe8bc98260b4ee3546594f27fc9798&=&width=400&height=266';

    await ctx.write({ content: fihImage });
}
}