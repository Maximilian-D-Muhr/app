import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Parse Firebase config
const config = JSON.parse(process.env.FIREBASE_CONFIG!);

// Import service account
// tslint:disable-next-line:no-var-requires
const serviceAccount = require('../service-account.json');

// Initialize Firebase app
admin.initializeApp({
    ...config,
    credential: admin.credential.cert(serviceAccount),
});

// Export existing functions
export * from './lib/spotify-auth';
export * from './lib/vote-processor';

// Add new functions
export const helloWorld = functions.https.onRequest((request, response) => {
  response.send("Hello from Musik DJ!");
});

export const createParty = functions.https.onCall((data, context) => {
  // Implement logic to create a new party
  const partyId = Math.random().toString(36).substring(2, 15);
  return { partyId: partyId };
});

export const addSongToPlaylist = functions.https.onCall((data, context) => {
  // Implement logic to add a song to the playlist
  const { partyId, songId } = data;
  // Here you would add the song to the playlist in the database
  return { success: true, message: `Song ${songId} added to party ${partyId}` };
});

// Add more functions as needed for your Musik DJ project
