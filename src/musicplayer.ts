import * as Discord from 'discord.js';
import * as config from './config.json';
import * as Voice from '@discordjs/voice';
import * as ytdl from 'ytdl-core';
import * as ytpl from 'ytpl';
import * as ytsr from 'ytsr';
import { Util } from './util/util';

interface Subcommand {
    name: string;
    aliases?: string[];
    execute(message: Discord.Message, args: string[]): any;
    description: string;
}

interface Song  {
    title: string;
    url: string;
}

interface Connection {
    queue: Song[];
    textChannel: Discord.TextChannel;
    voiceChannel: Discord.VoiceBasedChannel;
    connection: Voice.VoiceConnection;
    player?: Voice.AudioPlayer;
    loop?: boolean;
    oldMsg?: Discord.Message;
}

const play = async (message: Discord.Message) => {
    const connection = MusicPlayer.connections.get(message.guild.id);
    if (!connection) return;
    if (connection.queue.length <= 0) return;

    const player = Voice.createAudioPlayer();
    const stream = ytdl(connection.queue[0].url, { 
        filter: 'audioonly',
        quality: 'lowestaudio'
    });
    const resource = Voice.createAudioResource(stream, { inlineVolume: true });

    resource.playStream.on('error', (err) => {
        console.error(err);
    });

    resource.playStream.on('readable', () => console.log('PlayStream readable'));

    console.log(`Resource is readable: ${resource.readable}`);
    console.log(`Resource has buffer: ${resource.playStream['_buffer'] ? 'true' : 'false'}`);

    resource.volume.setVolumeLogarithmic(0.2);
    connection.player = player;

    player.play(resource);
    connection.connection.subscribe(player);

    player.on('error', (err) => {
        console.error(err);
    });

    if (connection.oldMsg && connection.oldMsg.deletable) connection.oldMsg.delete();
    connection.oldMsg = await Util.send(connection.textChannel, `Now playing: [${connection.queue[0].title}](${connection.queue[0].url})`);

    player.on(Voice.AudioPlayerStatus.Idle, () => {
        console.log('Idle');
        player.stop(true);
        if (connection.loop) connection.queue.push(connection.queue.shift());
        else connection.queue.shift();

        if (connection.queue.length > 0) play(message);
    });
}

class MusicPlayer {
    public static connections: Map<string, Connection> = new Map<string, Connection>();
    private static pages = new Map<string, number>();
    
    public static subcommands: Subcommand[] = [
        {
            name: 'play',
            execute: async (message: Discord.Message, args: string[]) => {
                if (args.length <= 0) return;
                if (!message.member?.voice.channel) return Util.reply(message, 'You need to be in a voice channel to use this command!', { color: config.colors.error });
                
                if (!this.connections.has(message.guild.id)) {
                    this.connections.set(message.guild.id, {
                        queue: [],
                        textChannel: message.channel as Discord.TextChannel,
                        voiceChannel: message.member.voice.channel,
                        connection: Voice.joinVoiceChannel({
                            channelId: message.member.voice.channel.id,
                            guildId: message.guild.id,
                            adapterCreator: message.guild.voiceAdapterCreator as any
                        })
                    });
                }
                
                const connection = this.connections.get(message.guild.id);
                if (!connection) return; // Should never happen

                connection.connection.on('stateChange', (oldState, newState) => {
                    if (newState.status == Voice.VoiceConnectionStatus.Destroyed || newState.status == Voice.VoiceConnectionStatus.Disconnected) {
                        this.connections.delete(message.guild.id);
                    }
                });

                const songs = await this.getSong(args);
                connection.queue = connection.queue.concat(songs);
                if (songs.length <= 0) {
                    Util.reply(message, 'No songs were found!', { color: config.colors.error });
                }
                else if (songs.length == 1) {
                    Util.reply(message, `Added [${songs[0].title}](${songs[0].url}).`);
                }
                else if (songs.length > 1) {
                    Util.reply(message, `Added ${songs.length} songs.`);
                }

                if (!connection.player || connection.player.state.status != Voice.AudioPlayerStatus.Playing) {
                    play(message);
                }
            },
            description: 'Play a song.'
        }, // play
        {
            name: 'skip',
            aliases: ['next'],
            execute: (message: Discord.Message, args: string[]) => {
                if (!message.member?.voice.channel) return Util.reply(message, 'You need to be in a voice channel to use this command!', { color: config.colors.error });
                const connection = this.connections.get(message.guild.id);
                if (!connection) return;
                if (connection.loop) connection.queue.push(connection.queue.shift());
                else connection.queue.shift();
                if (connection.player) connection.player.stop(true);
            },
            description: 'Skip the current song.'
        }, // skip
        {
            name: 'clear',
            execute: (message: Discord.Message, args: string[]) => {
                if (!message.member?.voice.channel) return Util.reply(message, 'You need to be in a voice channel to use this command!', { color: config.colors.error });
                const connection = this.connections.get(message.guild.id);
                if (!connection) return;
                connection.queue = [];
                if (connection.player) connection.player.stop(true);
                Util.reply(message, 'Queue cleared!');
            },
            description: 'Clear the queue.'
        }, // clear
        {
            name: 'stop',
            aliases: ['pause'],
            execute: (message: Discord.Message, args: string[]) => {
                if (!message.member?.voice.channel) return Util.reply(message, 'You need to be in a voice channel to use this command!', { color: config.colors.error });
                const connection = this.connections.get(message.guild.id);
                if (!connection) return;
                if (connection.player) connection.player.pause();
                Util.reply(message, 'Stopped!');
            },
            description: 'Stop the current song.'
        }, // stop
        {
            name: 'resume',
            aliases: ['unpause'],
            execute: (message: Discord.Message, args: string[]) => {
                if (!message.member?.voice.channel) return Util.reply(message, 'You need to be in a voice channel to use this command!', { color: config.colors.error });
                const connection = this.connections.get(message.guild.id);
                if (!connection) return;
                if (connection.player) connection.player.unpause();
                Util.reply(message, 'Resumed!');
            },
            description: 'Resume the current song.'
        }, // resume
        {
            name: 'loop',
            execute: (message: Discord.Message, args: string[]) => {
                if (!message.member?.voice.channel) return Util.reply(message, 'You need to be in a voice channel to use this command!', { color: config.colors.error });
                const connection = this.connections.get(message.guild.id);
                if (!connection) return;
                if (connection.player) connection.loop = !connection.loop;
                Util.reply(message, `Looping is now ${connection.loop ? 'enabled' : 'disabled'}!`);
            },
            description: 'Toggle looping.'
        }, // loop
        {
            name: 'leave',
            execute: (message: Discord.Message, args: string[]) => {
                if (!message.member?.voice.channel) return Util.reply(message, 'You need to be in a voice channel to use this command!', { color: config.colors.error });
                const connection = this.connections.get(message.guild.id);
                if (!connection) return;
                if (connection.player) connection.player.stop(true);
                connection.queue = [];
                connection.connection.disconnect();
                this.connections.delete(message.guild.id);
                Util.reply(message, 'Disconnected!');
            },
            description: 'Leave the voice channel.'
        }, // leave
        {
            name: 'join',
            execute: (message: Discord.Message, args: string[]) => {
                if (!message.member?.voice.channel) return Util.reply(message, 'You need to be in a voice channel to use this command!', { color: config.colors.error });
                if (!this.connections.has(message.guild.id)) {
                    let connection = this.connections.get(message.guild.id);
                    if (connection) {
                        connection.queue = [];
                        if (connection.player) connection.player.stop(true);
                        connection.connection.disconnect();
                        this.connections.delete(message.guild.id);
                    }
                    connection = {
                        queue: [],
                        textChannel: message.channel as Discord.TextChannel,
                        voiceChannel: message.member.voice.channel,
                        connection: Voice.joinVoiceChannel({
                            channelId: message.member.voice.channel.id,
                            guildId: message.guild.id,
                            adapterCreator: message.guild.voiceAdapterCreator as any
                        })
                    };
                    connection.connection.on('stateChange', (oldState, newState) => {
                        if (newState.status == Voice.VoiceConnectionStatus.Destroyed || newState.status == Voice.VoiceConnectionStatus.Disconnected) {
                            this.connections.delete(message.guild.id);
                        }
                    });
                }
                else {
                    const connection = this.connections.get(message.guild.id);
                    if (!connection) return;
                    connection.connection.disconnect();
                    connection.voiceChannel = message.member.voice.channel;
                    connection.connection = Voice.joinVoiceChannel({
                        channelId: message.member.voice.channel.id,
                        guildId: message.guild.id,
                        adapterCreator: message.guild.voiceAdapterCreator as any
                    });
                    connection.connection.on('stateChange', (oldState, newState) => {
                        if (newState.status == Voice.VoiceConnectionStatus.Destroyed || newState.status == Voice.VoiceConnectionStatus.Disconnected) {
                            this.connections.delete(message.guild.id);
                        }
                    });
                    if (connection.player) connection.connection.subscribe(connection.player);
                }
                Util.reply(message, 'Connected!');
            },
            description: 'Join the voice channel.'
        }, // join
        {
            name: 'queue',
            aliases: ['list'],
            execute: (message: Discord.Message, args: string[]) => {
                if (!message.member?.voice.channel) return Util.reply(message, 'You need to be in a voice channel to use this command!', { color: config.colors.error });
                const connection = this.connections.get(message.guild.id);
                if (!connection) return;

                if (connection.queue.length <= 0) return Util.reply(message, 'Queue is empty!', { color: config.colors.error });

                if (connection.queue.length > 10) {
                    this.pages.set(message.author.id, 0);
                    Util.buttonMessage(message.channel, this._queuePage(message, this.pages.get(message.author.id)), [
                        {
                            text: '???',
                            callback: (interaction) => {
                                this.pages.set(message.author.id, this.pages.get(message.author.id) - 1);
                                if (this.pages.get(message.author.id) < 0) this.pages.set(message.author.id, Math.ceil(connection.queue.length / 10) - 1);
                                let embed = interaction.message.embeds[0];
                                embed.description = this._queuePage(message, this.pages.get(message.author.id));
                                interaction.update({embeds: [embed]});
                            }
                        },
                        {
                            text: '???',
                            callback: (interaction) => {
                                this.pages.set(message.author.id, this.pages.get(message.author.id) + 1);
                                if (this.pages.get(message.author.id) >= Math.ceil(connection.queue.length / 10)) this.pages.set(message.author.id, 0);
                                let embed = interaction.message.embeds[0];
                                embed.description = this._queuePage(message, this.pages.get(message.author.id));
                                interaction.update({embeds: [embed]});
                            }
                        }
                    ]);
                }
                else {
                    const queue = '**Queue:**\n' + connection.queue.map((song, index) => `${index + 1}. [${song.title}](${song.url})`).join('\n');

                    Util.send(message.channel, queue);
                }
            },
            description: 'Show the queue.'
        }, // queue
        {
            name: 'remove',
            aliases: ['delete'],
            execute: (message: Discord.Message, args: string[]) => {
                if (!message.member?.voice.channel) return Util.reply(message, 'You need to be in a voice channel to use this command!', { color: config.colors.error });
                const connection = this.connections.get(message.guild.id);
                if (!connection) return;
                if (connection.queue.length <= 0) return;
                if (connection.queue.length <= 0) return Util.reply(message, 'There is nothing in the queue!', { color: config.colors.error });
                if (args.length <= 0) return Util.reply(message, 'You need to specify a song to remove!', { color: config.colors.error });
                
                if (!args[0].includes('-') && !isNaN(parseInt(args[0]))) {
                    const index = parseInt(args[0]) - 1;
                    if (index < 0 || index >= connection.queue.length) return Util.reply(message, 'Invalid index!', { color: config.colors.error });
                    const song = connection.queue.splice(index, 1)[0];
                    Util.reply(message, `Removed [${song.title}](${song.url}) from the queue!`);
                }
                else if (args[0].includes('-') && args[0].split('-').length == 2 && args[0].split('-').every(x => !isNaN(parseInt(x)))) {
                    const start = parseInt(args[0].split('-')[0]) - 1;
                    const end = parseInt(args[0].split('-')[1]) - 1;
                    if (start < 0 || start >= connection.queue.length || end < 0 || end >= connection.queue.length || start > end) return Util.reply(message, 'Invalid index!', { color: config.colors.error });
                    const songs = connection.queue.splice(start, end - start + 1);
                    Util.reply(message, `Removed ${songs.length} songs from the queue!`);
                }
            },
            description: 'Remove a song from the queue.'
        }, // remove
        {
            name: 'shuffle',
            execute: (message: Discord.Message, args: string[]) => {
                if (!message.member?.voice.channel) return Util.reply(message, 'You need to be in a voice channel to use this command!', { color: config.colors.error });
                const connection = this.connections.get(message.guild.id);
                if (!connection) return;
                if (connection.queue.length <= 0) return Util.reply(message, 'There is nothing in the queue!', { color: config.colors.error });
                connection.queue = Util.shuffle(connection.queue);
                Util.reply(message, 'Shuffled the queue!');
            },
            description: 'Shuffle the queue.'
        }, // shuffle
        {
            name: 'loopshuffleskip',
            aliases: ['lss'],
            execute: (message: Discord.Message, args: string[]) => {
                if (!message.member?.voice.channel) return Util.reply(message, 'You need to be in a voice channel to use this command!', { color: config.colors.error });
                const connection = this.connections.get(message.guild.id);
                if (!connection) return;
                connection.loop = true;
                this.subcommands.find(x => x.name == 'shuffle').execute(message, args);
                this.subcommands.find(x => x.name == 'skip').execute(message, args);
            },
            description: 'Loop and shuffle the queue and skip the current song.'
        }, // loopshuffleskip
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
            },
            description: 'Set the server musicprefix.'
        }, // serverprefix
        {
            name: 'savequeue',
            aliases: ['save'],
            execute: async (message: Discord.Message, args: string[]) => {
                if (args.length <= 0) return Util.reply(message, 'You need to specify a name!', { color: config.colors.error });

                const connection = this.connections.get(message.guild.id);
                if (!connection) return;

                if (connection.queue.length <= 0) return Util.reply(message, 'There is nothing in the queue!', { color: config.colors.error });

                global.users.get({ id: message.author.id }).then(user => {
                    if (user) {
                        if (!user.queues) user.queues = [];
                        user.queues.push({ name: args[0], queue: connection.queue });
                        global.users.set({ id: message.author.id }, user).then(() => {
                            Util.reply(message, `Saved the queue!`);
                        });
                    }
                    else {
                        global.users.set({ id: message.author.id }, { queues: [{ name: args[0], queue: connection.queue }] }).then(() => {
                            Util.reply(message, `Saved the queue!`);
                        });
                    }
                });
            },
            description: 'Save the queue.'
        }, // savequeue
        {
            name: 'loadqueue',
            aliases: ['load'],
            execute: async (message: Discord.Message, args: string[]) => {
                if (args.length <= 0) return Util.reply(message, 'You need to specify a name!', { color: config.colors.error });

                const connection = this.connections.get(message.guild.id);
                if (!connection) return;

                global.users.get({ id: message.author.id }).then(user => {
                    if (!user || !user.queues) return Util.reply(message, 'You have no queues!', { color: config.colors.error });
                    const queue = user.queues.find(x => x.name == args[0]);
                    if (!queue) return Util.reply(message, 'That queue does not exist!', { color: config.colors.error });
                    connection.queue = queue.queue;
                    Util.reply(message, 'Loaded the queue!');
                });
            },
            description: 'Load a queue.'
        }, // loadqueue
        {
            name: 'removequeue',
            execute: async (message: Discord.Message, args: string[]) => {
                if (args.length <= 0) return Util.reply(message, 'You need to specify a name!', { color: config.colors.error });

                const connection = this.connections.get(message.guild.id);
                if (!connection) return;

                global.users.get({ id: message.author.id }).then(user => {
                    if (!user || !user.queues) return Util.reply(message, 'You have no queues!', { color: config.colors.error });
                    user.queues = user.queues.filter(x => x.name != args[0]);
                    global.users.set({ id: message.author.id }, user);
                    Util.reply(message, 'Removed the queue!');
                });
            },
            description: 'Remove a queue.'
        }, // removequeue
        {
            name: 'listqueues',
            execute: async (message: Discord.Message, args: string[]) => {
                global.users.get({ id: message.author.id }).then(user => {
                    if (!user || !user.queues) return Util.reply(message, 'You have no queues!', { color: config.colors.error });
                    const queues = user.queues.map(x => `\`${x.name}\``).join(', ');
                    Util.reply(message, `Your queues are: ${queues}`);
                });
            },
            description: 'List your queues.'
        }, // listqueues
        {
            name: 'addqueue',
            execute: async (message: Discord.Message, args: string[]) => {
                if (args.length <= 0) return Util.reply(message, 'You need to specify a name!', { color: config.colors.error });

                const connection = this.connections.get(message.guild.id);
                if (!connection) return;

                global.users.get({ id: message.author.id }).then(user => {
                    if (!user || !user.queues) return Util.reply(message, 'You have no queues!', { color: config.colors.error });
                    const queue = user.queues.find(x => x.name == args[0]);
                    if (!queue) return Util.reply(message, 'That queue does not exist!', { color: config.colors.error });
                    connection.queue = connection.queue.concat(queue.queue);
                    Util.reply(message, 'Added the queue!');
                });
            },
            description: 'Add a queue to the current queue.'
        }, // addqueue
        {
            name: 'help',
            execute: async (message: Discord.Message, args: string[]) => {
                Util.reply(message, this.subcommands.map(x => `**${x.name}**: \`${x.description}\``).join('\n'), {
                    title: '???? Music Help ????'
                });
            },
            description: 'Help.'
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
                    if (results.items[0].type == 'video') {
                        const song = results.items[0];
                        resolve([{ title: song.title, url: song.url }]);
                    }
                    else if (results.items[0].type == 'playlist') {
                        if (ytpl.validateID(results.items[0].url)) {
                            try {
                                const playlist = await ytpl(results.items[0].url, { gl: 'DE' });
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
                            reject(new Error('Invalid playlist url!'));
                        }
                    }
                    else {
                        reject(new Error('Search found no video!'));
                    }
                } 
                catch (err) {
                    reject(err);
                }
            }
        });
    }
    private static _queuePage(message: Discord.Message, page: number): string {
        const connection = this.connections.get(message.guild.id);
        if (!connection) return;

        return `**Queue**\n${connection.queue.map((song, index) => `${index + 1}. [${song.title}](${song.url})`).slice(page * 10, page * 10 + 10).join('\n')}\nPage: ${page + 1}/${Math.ceil(connection.queue.length / 10)}`;
    }
}

export {
    MusicPlayer
};