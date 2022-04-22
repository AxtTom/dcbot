import * as Discord from 'discord.js';
import * as config from '../config.json';
import { Command } from '../command';
import { Util } from '../util/util';

const command: Command = {
    name: 'ping',
    category: 'misc',
    execute(message, args) {
        const start = message.createdTimestamp;
        Util.reply(message, "Pinging...").then(msg => {
            const end = msg.createdTimestamp;
            const ping = end - start;
            msg.edit({ embeds: [{
                color: config.colors.primary as Discord.ColorResolvable,
                description: `Pong!\n\n**Latency:** ${ping}ms`
            }] });
        });
        return true;
    }
};

export { command };