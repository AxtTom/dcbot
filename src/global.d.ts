import { Client } from 'discord.js';
import { EasyMongo } from './util/easymongo';

declare global {
    var client: Client;

    var users: EasyMongo;
    var guilds: EasyMongo;
    var place: EasyMongo;
}

export {};