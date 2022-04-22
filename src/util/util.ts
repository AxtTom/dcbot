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
    public static betterArgs(after: string): string[] {
        //after split by spaces and text between quotes as one argument
        let args = after.split(' ');
        let newArgs: string[] = [];
        let currentArg = '';
        let inQuotes = false;
        for (let i = 0; i < args.length; i++) {
            let arg = args[i];
            if (arg.startsWith('"') && arg.endsWith('"')) {
                currentArg += arg.substring(1, arg.length - 1);
                newArgs.push(currentArg);
                currentArg = '';
            } else if (arg.startsWith('"') && !arg.endsWith('"')) {
                currentArg += arg.substring(1, arg.length);
                inQuotes = true;
            } else if (!arg.startsWith('"') && arg.endsWith('"')) {
                currentArg += ' ' + arg.substring(0, arg.length - 1);
                newArgs.push(currentArg);
                currentArg = '';
                inQuotes = false;
            } else if (!inQuotes) {
                newArgs.push(arg);
            } else {
                currentArg += ' ' + arg;
            }
        }
        if (currentArg.length > 0) {
            newArgs.push(currentArg);
        }
        return newArgs;
    }

    public static reply(message: Discord.Message, text: string, options?: Options) {
        return message.reply(embed(text, options));
    }
    public static send(channel: Discord.TextBasedChannel, text: string, options?: Options) {
        return channel.send(embed(text, options));
    }

    public static buttonMessage(channel: Discord.TextBasedChannel, message: string, buttons: { text: string, callback: (interaction: Discord.ButtonInteraction) => void, style?: Discord.MessageButtonStyle }[], time: number = 60000, endCallback?: (collected: Discord.Collection<string, Discord.ButtonInteraction>, reason: string) => void): Promise<Discord.Message> {
        let ids = buttons.map(button => {
            return {
                callback: button.callback,
                id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
            }
        });

        let msg = channel.send({
            embeds:[{
                color: config.colors.primary as Discord.ColorResolvable,
                description: message,
            }],
            components: [{
                type: 1,
                components: buttons.map(button => {
                    return {
                        type: 2,
                        label: button.text,
                        style: button.style ? button.style : 'PRIMARY',
                        customId: ids.find(id => id.callback === button.callback).id
                    };
                })
            }]
        });
        msg.then(m => {
            const collector = m.createMessageComponentCollector({
                componentType: 'BUTTON',
                time: time
            });

            collector.on('collect', i => {
                ids.find(id => id.id === i.customId).callback(i);
            });

            collector.on('end', (collected, reason) => {
                m.edit({components: []});
                if (endCallback) {
                    endCallback(collected, reason);
                }
            });
            collector.on('dispose', () => {
                m.edit({components: []});
            })
        });
        return msg;
    }

    public static buttonEmbeds(
        channel: Discord.TextBasedChannel, 
        embeds: (Discord.MessageEmbed | Discord.MessageEmbedOptions)[],
        buttons: { 
            text: string, callback: (interaction: Discord.ButtonInteraction) => void, 
            style?: Discord.MessageButtonStyle 
        }[], 
        time: number = 60000, 
        endCallback?: (collected: Discord.Collection<string, Discord.ButtonInteraction>, reason: string) => void
    ): Promise<Discord.Message> {
        let ids = buttons.map(button => {
            return {
                callback: button.callback,
                id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
            }
        });

        let msg = channel.send({
            embeds: embeds,
            components: [{
                type: 1,
                components: buttons.map(button => {
                    return {
                        type: 2,
                        label: button.text,
                        style: button.style ? button.style : 'PRIMARY',
                        customId: ids.find(id => id.callback === button.callback).id
                    };
                })
            }]
        });
        msg.then(m => {
            const collector = m.createMessageComponentCollector({
                componentType: 'BUTTON',
                time: time
            });

            collector.on('collect', i => {
                ids.find(id => id.id === i.customId).callback(i);
            });

            collector.on('end', (collected, reason) => {
                m.edit({components: []});
                if (endCallback) {
                    endCallback(collected, reason);
                }
            });
            collector.on('dispose', () => {
                m.edit({components: []});
            })
        });
        return msg;
    }

    public static shortNumber(num: number): string {
        let count = 0;
        let n = num;
        while (n >= 1000) {
            n /= 1000;
            count++;
        }

        let c;
        switch (count) {
            case 1:
                c = 'K';
                break;
            case 2:
                c = 'M';
                break;

            default:
                c = '';
                break; 
        }
        return `${Math.round(n * 10) / 10}${c}`
    }

    public static shuffle(a: any[]): any[] {
        var j, x, i;
        for (i = a.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1));
            x = a[i];
            a[i] = a[j];
            a[j] = x;
        }
        return a;
    }
    public static removeDupes(a: any[]): any[] {
        return a.filter((v, i, a) => a.indexOf(v) === i);
    }
}

export {
    Util
};