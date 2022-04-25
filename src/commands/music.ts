import * as Discord from 'discord.js';
import * as config from '../config.json';
import { Command } from '../command';
import { Util } from '../util/util';
import { MusicPlayer } from '../musicplayer';

const command: Command = {
    name: 'music',
    aliases: ['m'],
    usage: '<command> [args]',
    description: 'Music commands',
    guilds: [ '796704138057875489' ],
    execute(message, { args }) {
        if (args.length <= 0) return false;
        return MusicPlayer.handle(message, args);
    }
};

export { command };