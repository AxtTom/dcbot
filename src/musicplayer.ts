import * as Discord from 'discord.js';
import * as Voice from '@discordjs/voice';
import * as ytdl from 'ytdl-core';
import * as ytpl from 'ytpl';
import * as ytsr from 'ytsr';
import { Util } from './util/util';

interface Subcommand {
    name: string;
    aliases?: string[];
    execute(message: Discord.Message, args: string[]): any;
}

interface Song  {
    title: string;
    url: string;
}

interface Queue {
    textChannel: Discord.TextChannel;
    voiceChannel: Discord.VoiceChannel;
    connection: Voice.VoiceConnection;
    songs: Song[];
    loop: boolean;
    volume: number;
    playing: boolean;
}

class MusicPlayer {
    private static queue: Map<string, Queue> = new Map<string, Queue>();
    public static subcommands: Subcommand[] = [
        {
            name: 'play',
            execute: async (message: Discord.Message, args: string[]) => {
                if (args.length <= 0) return;
                console.log(await this.getSong(args));
            }
        },
        {
            name: 'serverprefix',
            execute: async (message: Discord.Message, args: string[]) => {
                if (!message.member.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR)) return;

                if (args.length == 0) {
                    global.guilds.get({ id: message.guild.id }).then(guild => {
                        if (guild && guild.musicprefix) Util.reply(message, `The server musicprefix is \`${guild.musicprefix}\``);
                        else Util.reply(message, 'The server has no musicprefix.');
                    });
                }
                if (args.length == 1) {
                    global.guilds.set({ id: message.guild.id }, { musicprefix: args[0] }).then(() => {
                        Util.reply(message, `The server musicprefix has been set to \`${args[0]}\``);
                    });
                }
            }
        }
    ];

    public static handle(message: Discord.Message, args: string[]): boolean {
        if (args.length <= 0) return false;
        const commandName = args.shift();
        const command = this.subcommands.find(c => c.name == commandName || (c.aliases && c.aliases.includes(commandName)));
        if (!command) return false;

        command.execute(message, args);
        return true;
    }

    private static async getSong(url: string[]): Promise<Song[]> {
        return new Promise<Song[]>(async (resolve, reject) => {
            if (ytdl.validateURL(url[0])) {
                try {
                    const song = await ytdl.getInfo(url[0]);
                    resolve([{ title: song.videoDetails.title, url: song.videoDetails.video_url }]);
                } 
                catch (err) {
                    reject(err);
                }
            }
            else if (ytpl.validateID(url[0])) {
                try {
                    const playlist = await ytpl(url[0], { gl: 'DE' });
                    const songs: Song[] = [];
                    for (const song of playlist.items) {
                        songs.push({ title: song.title, url: song.url });
                    }
                    resolve(songs);
                } 
                catch (err) {
                    reject(err);
                }
            }
            else {
                try {
                    const results = await ytsr(url.join(' '), { limit: 1, gl: 'DE', hl: 'de' });
                    const song = results.items[0] as any;
                    resolve([{ title: song.title, url: song.url }]);
                } 
                catch (err) {
                    reject(err);
                }
            }
        });
    }
}

export {
    MusicPlayer
};