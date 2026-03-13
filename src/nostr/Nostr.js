import  fs from 'fs';
import readline from 'readline';
import { generateSecretKey, getPublicKey } from '@nostr/tools/pure'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'
import { json } from 'stream/consumers';


class Nostr {
    privateKey  = null;
    publicKey = null;
    constructor() {
        this.loadKeys();
    }


    loadKeys(){
        const keys = JSON.parse(fs.readFileSync('nostr_keys.json', 'utf8'));
      
        if(keys.privateKey == null || keys.publicKey == null){
            this.privateKey = generateSecretKey();
            this.publicKey = getPublicKey(this.privateKey);
            this.saveAgentKeys();
        }
        this.privateKey = keys.privateKey;
        this.publicKey = keys.publicKey;

        

    }

    saveAgentKeys(){
        fs.writeFileSync('nostr_keys.json', JSON.stringify({
            privateKey: bytesToHex(this.privateKey), 
            publicKey: this.publicKey
        }));
    }

    saveAgentOwnerPubKey(pubKey){
        fs.writeFileSync('owner_pubKey.json', JSON.stringify({
            pubKey: pubKey, 
        }));
    }

    showKeys(){
       
        console.log(`Private Key: ${this.privateKey}`);
        console.log(`Public Key: ${this.publicKey}`);
    }


    connectToRelay()
    {

    }

    /**
     * Fetch messages between agent and owner from nostr
     */
    getMessages()
    {
        
    }

    /**
     * Send message to agent owner via nostr
     */
    sendMessages()
    {

    }

    /**
     * Will be called to actively store agent owner nostr public key for 
     * direct communication  
     */
    storeAgentOwnerPubKey()
    {
        const ownerKey =JSON.parse( fs.readFileSync("owner_pubKey.json",'utf8'));
        let question = "";
        const cliInterface = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })

        if(ownerKey.pubKey == null)
        {
            question = "No key found, what's your nostr public key:";
            cliInterface.question(question, (pubkey) => {
                this.saveAgentOwnerPubKey(pubkey);
                console.log(`Agent owner public key stored: ${pubkey}`);
                cliInterface.close();
            });
        }else{
            question = `I found ${ownerKey.pubKey}, do you want to keep using this? enter yes/no:`;
            cliInterface.question(question, (answer) => {
                switch (answer) {
                    case "yes":
                        cliInterface.close();
                        break;

                    case "no":
                        question = "What's your nostr public key";
                        cliInterface.question(question,(pubkey) => {
                            this.saveAgentOwnerPubKey(pubkey);
                            console.log(`Agent owner public key stored: ${pubkey}`);
                            cliInterface.close();
                        })
                        break;
                    
                    default:
                        break;
                }
            });

        }


    }
}

const NostrObj = new Nostr()

export {
    NostrObj
}

