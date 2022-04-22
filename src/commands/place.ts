import * as Discord from 'discord.js';
import * as config from '../config.json';
import { Command } from '../command';
import { Util } from '../util/util';
import * as crypto from 'crypto';

const command: Command = {
    name: 'place',
    category: 'misc',
    description: 'r/place clone',
    execute(message, args) {
        const id = message.author.id + "1cb892764";
        const hash = crypto.createHash('md5').update(id).digest('hex');
        global.place.set({ id: message.author.id }, { secret: hash }).then(() => {
            message.author.send(`Dont share: https://axttom.de/place?id=${hash}`);
            Util.reply(message, `Check your DM's!`);
        });
        return true;
    }
};

export { command };