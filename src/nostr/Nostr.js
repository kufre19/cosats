import fs from 'fs';
import readline from 'readline';
import { generateSecretKey, getPublicKey, finalizeEvent, verifyEvent,getEventHash } from '@nostr/tools/pure'
import { useWebSocketImplementation } from '@nostr/tools/pool'
import { SimplePool } from '@nostr/tools/pool'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'
import nostrRelays from './nostr_relays.json' with {type: "json"}
import WebSocket from 'ws'
import * as nip44 from '@nostr/tools/nip44';
import * as nip19 from '@nostr/tools/nip19';

useWebSocketImplementation(WebSocket)



class Nostr {
    privateKey = null;
    publicKey = null;
    privateKeyInBytes = null;
    agentOwnerPubKey = null;

    constructor() {
        this.loadKeys();
        this.loadAgentOwnerPubkey();
    }


    // read this method again and refactor this method later to be less code and less stupid... lol
    loadKeys() {
        let keys = JSON.parse(fs.readFileSync('keys/nostr_keys.json', 'utf8'));

        if (keys.privateKey == null || keys.publicKey == null) {
            this.privateKey = generateSecretKey();
            this.publicKey = getPublicKey(this.privateKey);
            this.privateKeyInBytes = hexToBytes(keys.privateKey) ;
            this.saveAgentKeys();
        }else{
            this.privateKey = keys.privateKey;
            this.privateKeyInBytes = hexToBytes(keys.privateKey) ;
            this.publicKey = keys.publicKey;
        }
       

    }

    /**
     * Will be used to load the agent owner public key into the object for easier access--
     * 
     */
    loadAgentOwnerPubkey() {
        const keys = JSON.parse(fs.readFileSync('keys/owner_pubKey.json', 'utf8'));
        if (keys.pubKey == null) {
            this.agentOwnerPubKey = this.requetAgentOwnerPubKey();
        } else {
            this.agentOwnerPubKey = keys.pubKey;
        }
    }

    saveAgentKeys() {
        fs.writeFileSync('keys/nostr_keys.json', JSON.stringify({
            privateKey: bytesToHex(this.privateKey),
            publicKey: this.publicKey
        }));
    }

    saveAgentOwnerPubKey(pubKey) {
        fs.writeFileSync('keys/owner_pubKey.json', JSON.stringify({
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
                kinds: [1,14],
                authors: [this.publicKey,this.agentOwnerPubKey],
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
    async sendMessages(message) {
        // let's publish a new event while simultaneously monitoring the relay for it

        const relays = nostrRelays;
        const pool = new SimplePool();

        let dmSubject = message.subject || "annthing ";
        let privateDmMessage = message.message || "this is a private dm ";


        let kind14Event = {
            "kind": 14,
            "tags": [
                ["p",this.agentOwnerPubKey, nostrRelays[0]],
                ["subject", dmSubject],
            ],
            "content": privateDmMessage
        }


        let rumor = this.createRumor(kind14Event,this.privateKeyInBytes);
        let seal = this.createSeal(rumor,this.privateKeyInBytes,this.agentOwnerPubKey);
        let giftWrap = this.createWrap(seal,this.agentOwnerPubKey);


        const messageSentToRelay = await Promise.any(pool.publish(relays, giftWrap))
        console.log("message sent to relay: ", messageSentToRelay);

        return messageSentToRelay;

    }

    nip44ConversationKey(privateKey, RecipientPublicKey){
        return nip44.v2.utils.getConversationKey(privateKey, RecipientPublicKey)
    }
       
      
    nip44Encrypt(data, privateKey, publicKey){
        return nip44.v2.encrypt(JSON.stringify(data), this.nip44ConversationKey(privateKey, publicKey));
    }
        
      
    nip44Decrypt(data, privateKey){
        return  JSON.parse(nip44.v2.decrypt(data.content, this.nip44ConversationKey(privateKey, data.pubkey)));
    }
       

    createRumor(event, privateKey){
        const rumor = {
          created_at: Math.floor(Date.now() / 1000),
          content: "",
          tags: [],
          ...event,
          pubkey: getPublicKey(privateKey),
        } 
      
        rumor.id = getEventHash(rumor)
      
        return rumor;
    }
    createSeal(rumor, privateKey, recipientPublicKey){
        return finalizeEvent(
          {
            kind: 13,
            content: this.nip44Encrypt(rumor, privateKey, recipientPublicKey),
            created_at: this.randomNow(),
            tags: [],
          },
          privateKey
        )
      }
      
    createWrap = (event, recipientPublicKey) => {
        const randomKey = generateSecretKey()
      
        return finalizeEvent(
          {
            kind: 1059,
            content: this.nip44Encrypt(event, randomKey, recipientPublicKey),
            created_at: this.randomNow(),
            tags: [["p", recipientPublicKey]],
          },
          randomKey
        )
    }

    generateRandomKeys()
    {
        let secKey = generateSecretKey();
        let pubKey = getPublicKey(secKey);
        return {
            "secKey": secKey,
            "pubKey": pubKey
        }
    }
    randomNow()
    {
        
        return  Math.floor( (Date.now()/1000) - ((Math.floor(Math.random() * (5 - 2 + 1)) + 2) * 24 * 60 * 60) ); //creating a random timestamp between 2 - 5 days
    }

    giftWrapAndSeal() {
        return `{
        }`
    }

    /**
     * Will be called to actively request and store agent owner nostr public key for 
     * direct communication  with the agent owner
     */
    requetAgentOwnerPubKey() {
        const ownerKey = JSON.parse(fs.readFileSync("keys/owner_pubKey.json", 'utf8'));
        let question = "";
        let agentOwnerPubKey = "";
        const cliInterface = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })

        if (ownerKey.pubKey == null) {
            question = "No key found, what's your nostr public key:";
            cliInterface.question(question, (pubkey) => {
                this.saveAgentOwnerPubKey(pubkey);
                agentOwnerPubKey = pubkey;
                console.log(`Agent owner public key stored: ${pubkey}`);
                cliInterface.close();
            });
        } else {
            question = `I found ${ownerKey.pubKey}, do you want to keep using this? enter yes/no:`;
            cliInterface.question(question, (answer) => {
                switch (answer) {
                    case "yes":
                        agentOwnerPubKey = ownerKey.pubKey;

                        cliInterface.close();
                        break;

                    case "no":
                        question = "What's your nostr public key";
                        cliInterface.question(question, (pubkey) => {
                            this.saveAgentOwnerPubKey(pubkey);
                            agentOwnerPubKey = pubkey
                            console.log(`Agent owner public key stored: ${pubkey}`);
                            cliInterface.close();
                        })
                        break;

                    default:
                        break;
                }
            });

        }

        return agentOwnerPubKey;


    }
}

const NostrObj = new Nostr()

export {
    NostrObj
}

