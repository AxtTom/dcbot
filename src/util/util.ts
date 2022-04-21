import * as Discord from 'discord.js';
import * as config from '../config.json';

interface Options {
    title?: string;
    color?: string;
    footer?: string;
    image?: string;
    thumbnail?: string;
}
function embed(text: string, options?: Options): Discord.MessageOptions {
    return {embeds:[{
        description: text,
        color: (options?.color ?? config.colors.primary) as Discord.ColorResolvable,
        title: (options?.title ?? ''),
        footer: {
            text: (options?.footer ?? '')
        },
        image: {
            url: (options?.image ?? '')
        },
        thumbnail: {
            url: (options?.thumbnail ?? '')
        }
    }]};
}

class Util {
    public static reply(message: Discord.Message, text: string, options?: Options) {
        return message.reply(embed(text, options));
    }
    public static send(channel: Discord.TextBasedChannel, text: string, options?: Options) {
        return channel.send(embed(text, options));
    }
}

export {
    Util
};