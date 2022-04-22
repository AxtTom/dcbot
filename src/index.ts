require('dotenv').config();
require('./util/consolelog').config();

import * as config from './config.json';

import * as fs from 'fs';
import * as Discord from 'discord.js';
import { MongoClient } from 'mongodb';
import { Handler } from './command';
import { EasyMongo } from './util/easymongo';
import { MusicPlayer } from './musicplayer';

const mongo = new MongoClient('mongodb://localhost:27017');

async function main() {
    await mongo.connect();
    console.log('Connected to MongoDB');

    const db = mongo.db('discord');
    global.users = new EasyMongo(db.collection('users'));
    global.guilds = new EasyMongo(db.collection('guilds'));
    
    const web = mongo.db('website');
    global.place = new EasyMongo(web.collection('place'));
    
    // Load commands
    for (const file of fs.readdirSync(`${__dirname}/commands`)) {
        if (!file.endsWith('.ts')) continue;

        Handler.register(require(`./commands/${file}`).command);
    }
    console.log(`Loaded ${Handler.commands.length} command${Handler.commands.length > 1 ? 's' : ''}.`);

    global.client = new Discord.Client({
        intents: [
            Discord.Intents.FLAGS.GUILDS,
            Discord.Intents.FLAGS.GUILD_MESSAGES,
            Discord.Intents.FLAGS.GUILD_MEMBERS
        ]
    });

    global.client.once('ready', (client) => {
        console.log(`Logged in as ${client.user.tag}`);
    });

    global.client.on('messageCreate', async (message) => {
        Handler.handleMessage(message);

        global.guilds.get({ id: message.guild.id }).then(guild => {
            if (guild && guild.musicprefix && message.content.startsWith(guild.musicprefix)) {
                MusicPlayer.handle(message, message.content.slice(guild.musicprefix.length).trim().split(/ +/));
            }
        });
    });

    console.log('Logging in...');
    global.client.login(process.env.DISCORD_TOKEN);

    // Catch all uncaught exceptions
    process.on('uncaughtException', (err) => {
        console.error(err);
    });
}

main();