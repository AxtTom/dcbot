require('dotenv').config();
require('./util/consolelog').config();

import * as config from './config.json';

import * as fs from 'fs';
import * as Discord from 'discord.js';
import { MongoClient } from 'mongodb';
import { Handler } from './command';
import { EasyMongo } from './util/easymongo';

const mongo = new MongoClient('mongodb://localhost:27017');

async function main() {
    await mongo.connect();
    console.log('Connected to MongoDB');

    const db = mongo.db('discord');
    global.users = new EasyMongo(db.collection('users'));
    global.guilds = new EasyMongo(db.collection('guilds'));

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
    });

    console.log('Logging in...');
    global.client.login(process.env.DISCORD_TOKEN);

    // Catch all uncaught exceptions
    process.on('uncaughtException', (err) => {
        console.error(err);
    });
}

main();