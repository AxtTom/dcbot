import * as Discord from 'discord.js';
import * as config from '../config.json';
import { Command, Handler } from '../command';
import { Util } from '../util/util';
import { MusicPlayer } from '../musicplayer';

const command: Command = {
    name: 'help',
    aliases: ['commands'],
    usage: '<command>',
    execute(message, { args }) {
        if (args.length <= 0) {
            Util.reply(message, 
                `✨ Misc
                ${Handler.commands.filter(x => x.category === 'misc').map(x => `\`${x.name}\``).join(', ')}
                🎵 Music
                \`music <${MusicPlayer.subcommands.map(x => x.name).join(' | ')}> [args...]\`
                🔧 Administration
                ${Handler.commands.filter(x => x.category === 'admin').map(x => `\`${x.name}\``).join(', ')}
                `, {
                title: `${config.profiles[config.profile].name} Commands`,
                thumbnail: global.client.user.avatarURL()
            });
        }
        else {
            const command = Handler.commands.find(cmd => cmd.name === args[0] || (cmd.aliases && cmd.aliases.includes(args[0])));
            if (!command) {
                Util.reply(message, `Command \`${args[0]}\` not found.`, { color: config.colors.error });
                return true;
            }
            let description = '';
            if (command.description) description += `**Description:** ${command.description}\n`;
            if (command.usage) description += `**Usage:** \`${command.name} ${command.usage}\`\n`;
            Util.reply(message, description, {
                title: `Command: ${command.name}`,
            });
        }
        return true;
    }
};

export { command };