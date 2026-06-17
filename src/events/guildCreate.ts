import { createEvent } from 'seyfert';
import { guilds } from '../db/schema';

export default createEvent({
  data: { once: false, name: 'guildCreate' },
  async run(guild, client) {
    await client.db.insert(guilds)
      .values({ guildId: guild.id, prefix: 'retsuki' })
      .onConflictDoNothing();
  }
})