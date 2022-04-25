import * as Discord from 'discord.js';
import * as config from '../config.json';
import { Command } from '../command';
import { Util } from '../util/util'; 

const command: Command = {
    name: 'membercount',
    usage: '[channel] [count]',
    permissions: [ Discord.Permissions.FLAGS.ADMINISTRATOR ],
    execute(message, { args }) {
        if (args.length == 0) {
            global.guilds.get({ id: message.guild.id }).then(guild => {
                if (guild && guild.membercount) Util.reply(message, `The server membercount is \`${guild.membercount.count}\` and <#${guild.membercount.channel}>`);
                else Util.reply(message, 'The server has no membercount.');
            });
            return true;
        }
        if (args.length >= 2 && message.mentions.channels.size == 1) {
            global.guilds.set({ id: message.guild.id }, { membercount: { count: args.slice(1).join(' '), channel: message.mentions.channels.first().id } }).then(() => {
                Util.reply(message, `The server membercount has been set to \`${args.slice(1).join(' ')}\` and <#${message.mentions.channels.first().id}>`);
            });
            return true;
        }

        return false;
    }
};

export { command };