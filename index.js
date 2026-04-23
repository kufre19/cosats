import { Models } from './src/Models/Models.js';
import { Nostr } from './src/nostr/Nostr.js';
import { Agent } from './src/Agent/Agent.js';
import event from 'events';



async function main() {
 
    // step 1 init nostr
    const nostrObj = new Nostr();
    nostrObj.showKeys();
    

    // step 2 init models
   const modelsObj = new Models();
   await modelsObj.initModel();

    // step 3 init and test agent   
    const agentObj = new Agent();
    let agentTest  = await agentObj.testAgent();

    // step 4 if test is successful subscribe to nostr relays and listen for incoming messages
    nostrObj.subscribeToDmEvents();
    const customEvent = new event();
    customEvent.on("nostrDmRecevied", (data) => {
        console.log("event recevied from nostr " + data);

    });



}

main();