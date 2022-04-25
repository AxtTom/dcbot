import * as Discord from 'discord.js';
import * as config from '../config.json';
import { Command, Handler } from '../command';
import { Util } from '../util/util';

const command: Command = {
    name: 'reload',
    dev: true,
    usage: '<command>',
    execute(message, { args }) {
        if (args.length != 1) return false; 

        try {
            Handler.reload(args[0]);
            Util.reply(message, `Reloaded ${args[0]}`);
        }
        catch {
            Util.reply(message, `Failed to reload \`${args[0]}\``, { color: config.colors.error });
        }

        return true;
    }
};

export { command };