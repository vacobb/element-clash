import { getStore } from '@netlify/blobs';
import { createGameHandler } from '../../lib/game-handler.js';

// Credentials and site scope are supplied automatically by Netlify.
export default createGameHandler(() => getStore({name:'element-clash-rooms',consistency:'strong'}));
