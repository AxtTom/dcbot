import * as Discord from 'discord.js';
import * as config from './config.json';
import { Util } from './util/util';

interface Command {
    name: string;
    aliases?: string[];
    category?: string;
    description?: string;
    usage?: string;
    permissions?: Discord.PermissionResolvable[];
    guilds?: string[];
    dev?: boolean;
    execute(message: Discord.Message, {}: { args: string[], after: string, betterArgs: string[] }): Promise<boolean> | boolean;
}

class Handler {
    public static commands: Command[] = [];

    public static register(command: Command): void {
        this.commands.push(command);
    }
    public static reload(command: string): boolean {
        try {
            delete require.cache[require.resolve(`./commands/${command}`)];
            Handler.commands[Handler.commands.findIndex(x => x.name === command)] = require(`./commands/${command}`).command;
            return true;
        }
        catch (err) {
            console.error(err);
            return false;
        }
    }

    public static async handleMessage(message: Discord.Message) {
        if (message.author.bot) return;
        
        let prefix: string;
        if (message.content.startsWith(config.profiles[config.profile].prefix)) {
            prefix = config.profiles[config.profile].prefix;
        }
        else {
            const guild = await global.guilds.get({ id: message.guild.id });
            if (guild && guild.prefix && message.content.startsWith(guild.prefix)) prefix = guild.prefix;
        }
        if (!prefix) return;
        
        let args: string[] = message.content.slice(prefix.length).split(/ +/);
        const commandName = args.shift().toLowerCase();
        const after = message.content.slice(prefix.length + commandName.length).trim();
        args = message.content.slice(prefix.length).trim().split(/ +/).slice(1);
        const betterArgs = Util.betterArgs(after);
        const command = Handler.commands.find(cmd => cmd.name === commandName || (cmd.aliases && cmd.aliases.includes(commandName)));
        if (!command) return;

        if (command.permissions && !command.permissions.every(x => message.member.permissions.has(x))) {
            Util.reply(message, 'You do not have permission to use this command.', { color: config.colors.error });
            return;
        }
        if (command.guilds && !command.guilds.includes(message.guild.id)) return;
        if (command.dev && !config.devs.includes(message.author.id)) return;

        try {
            if (!await command.execute(message, { args, after, betterArgs })) {
                if (command.usage) Util.reply(message, `${command.name} ${command.usage}`, { title: "Usage:", color: config.colors.error });
            }
        }
        catch (err) {
            console.error(err);
        }
    }
}

export {
    Command,
    Handler
};