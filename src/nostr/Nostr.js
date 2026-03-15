import fs from 'fs';
import readline from 'readline';
import { generateSecretKey, getPublicKey,finalizeEvent, verifyEvent  } from '@nostr/tools/pure'
import { useWebSocketImplementation } from '@nostr/tools/pool'
import { SimplePool } from '@nostr/tools/pool'
import { bytesToHex,hexToBytes } from '@noble/hashes/utils.js'
import nostrRelays from './nostr_relays.json' with {type: "json"}
import WebSocket from 'ws'

useWebSocketImplementation(WebSocket)



class Nostr {
    privateKey = null;
    publicKey = null;
    constructor() {
        this.loadKeys();
    }


    loadKeys() {
        const keys = JSON.parse(fs.readFileSync('nostr_keys.json', 'utf8'));

        if (keys.privateKey == null || keys.publicKey == null) {
            this.privateKey = generateSecretKey();
            this.publicKey = getPublicKey(this.privateKey);
            this.saveAgentKeys();
        }
        this.privateKey = keys.privateKey;
        this.publicKey = keys.publicKey;



    }

    saveAgentKeys() {
        fs.writeFileSync('nostr_keys.json', JSON.stringify({
            privateKey: bytesToHex(this.privateKey),
            publicKey: this.publicKey
        }));
    }

    saveAgentOwnerPubKey(pubKey) {
        fs.writeFileSync('owner_pubKey.json', JSON.stringify({
            pubKey: pubKey,
        }));
    }

    showKeys() {

        console.log(`Private Key: ${this.privateKey}`);
        console.log(`Public Key: ${this.publicKey}`);
    }


    /**
     * Fetch messages between agent and owner from nostr
     */
    async getMessages() {
        const relays = nostrRelays;        
        const pool = new SimplePool();

        pool.subscribe(
            relays,
             {
                 kinds: [1],
                 authors: [this.publicKey],
             },
             {
                 onevent(event) {
                     console.log('got event:', event)
                 }
             }
         )

    }

    /**
     * Send message to agent owner via nostr
     */
    async sendMessages() {
        // let's publish a new event while simultaneously monitoring the relay for it
        
        const relays = nostrRelays;
        const pool = new SimplePool();

       
        let eventTemplate = {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [],
            content: 'hello world from cosats',
        }

        // this assigns the pubkey, calculates the event id and signs the event in a single step
        const signedEvent = finalizeEvent(eventTemplate, hexToBytes(this.privateKey))
        await Promise.any(pool.publish(relays, signedEvent))


    }

    /**
     * Will be called to actively store agent owner nostr public key for 
     * direct communication  
     */
    storeAgentOwnerPubKey() {
        const ownerKey = JSON.parse(fs.readFileSync("owner_pubKey.json", 'utf8'));
        let question = "";
        const cliInterface = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })

        if (ownerKey.pubKey == null) {
            question = "No key found, what's your nostr public key:";
            cliInterface.question(question, (pubkey) => {
                this.saveAgentOwnerPubKey(pubkey);
                console.log(`Agent owner public key stored: ${pubkey}`);
                cliInterface.close();
            });
        } else {
            question = `I found ${ownerKey.pubKey}, do you want to keep using this? enter yes/no:`;
            cliInterface.question(question, (answer) => {
                switch (answer) {
                    case "yes":
                        cliInterface.close();
                        break;

                    case "no":
                        question = "What's your nostr public key";
                        cliInterface.question(question, (pubkey) => {
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

