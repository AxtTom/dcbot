import * as Discord from 'discord.js';
import * as config from '../config.json';
import { Command } from '../command';
import { Util } from '../util/util'; 

const command: Command = {
    name: 'serverprefix',
    usage: '[prefix]',
    permissions: [ Discord.Permissions.FLAGS.ADMINISTRATOR ],
    execute(message, { args }) {
        if (args.length == 0) {
            global.guilds.get({ id: message.guild.id }).then(guild => {
                if (guild && guild.prefix) Util.reply(message, `The server prefix is \`${guild.prefix}\``);
                else Util.reply(message, 'The server has no prefix.');
            });
            return true;
        }
        if (args.length == 1) {
            if (args[0] == config.profiles[config.profile].prefix) {
                global.guilds.unset({ id: message.guild.id }, { prefix: null }).then(() => {
                    Util.reply(message, `The server prefix has been removed`);
                });
            }
            else {
                global.guilds.set({ id: message.guild.id }, { prefix: args[0] }).then(() => {
                    Util.reply(message, `The server prefix has been set to \`${args[0]}\``);
                });
            }
            return true;
        }

        return false;
    }
};

export { command };