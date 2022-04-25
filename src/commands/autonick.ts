import * as Discord from 'discord.js';
import * as config from '../config.json';
import { Command } from '../command';
import { Util } from '../util/util'; 

const command: Command = {
    name: 'autonick',
    usage: '[nick]',
    permissions: [ Discord.Permissions.FLAGS.ADMINISTRATOR ],
    execute(message, { after }) {
        if (after.length == 0) {
            global.guilds.get({ id: message.guild.id }).then(guild => {
                if (guild && guild.autonick) Util.reply(message, `The server autonick is \`${guild.autonick}\``);
                else Util.reply(message, 'The server has no autonick.');
            });
            return true;
        }
        if (after.length >= 1) {
            global.guilds.set({ id: message.guild.id }, { autonick: after }).then(() => {
                Util.reply(message, `The server autonick has been set to \`${after}\``);
            });
            return true;
        }

        return false;
    }
};

export { command };