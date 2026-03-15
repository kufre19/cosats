import dotenv from 'dotenv';
dotenv.config();
// import { sendMesageToModel } from './src/Models/index.js';
import { NostrObj } from './src/nostr/Nostr.js';



async function main() {
 

    // NostrObj.connectToRelay();
    NostrObj.sendMessages();
    // NostrObj.getMessages();

}

main();