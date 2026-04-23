import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import tools from "./tools.json" with {type: "json"};
import { Models } from '../Models/Models.js';
import { ExecuteTool } from './ExecuteTool.js';


class Agent {
    skillDirectory = ".agents/skills/";


    agenticLoop(MessageFromUser)
    {
        // will have hardcoded number of turns
        // will immediately send message to model parse it and determine the tool call needed
        // calling the method that sends message to user denotes end of loop 
    }


   
   async getAllAllSkillsMetaData()
    {
        const allMetaData = [];
        try {
            const directory = fs.readdirSync(this.skillDirectory);
            
            directory.forEach(file => {
                let filepath  = path.join(this.skillDirectory,file);
                let metadata = this.parseSkillMetadata(filepath);
                allMetaData.push(metadata);
            });
            
        } catch (error) {
            console.log(error);
            return false;
            
        }
        return allMetaData;
       
    }


    parseSkillMetadata(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');

            // Look for the classic YAML frontmatter delimited by ---
            const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
            const match = content.match(frontmatterRegex);

            if (!match || !match[1]) {
                console.warn(`No valid YAML frontmatter found in ${filePath}`);
                return null;
            }

            const yamlString = match[1];

            // Parse YAML safely
            const metadata = yaml.load(yamlString);

            // Basic validation - you can make this stricter
            if (!metadata || typeof metadata !== 'object') {
                console.warn(`Invalid YAML structure in ${filePath}`);
                return null;
            }

            // Optional: add defaults or normalize fields
            return {
                name: metadata.name || path.basename(path.dirname(filePath)),
                description: metadata.description || '',
                ...metadata
            };
        } catch (err) {
            console.error(`Failed to parse metadata from ${filePath}:`, err.message);
            return null;
        }
    }

   
   
    async loadFullSkillContent(filePath) {
        try {
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Remove the frontmatter block if present
        const body = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '').trim();
        
        if (!body) {
            console.warn(`No content body found after frontmatter in ${filePath}`);
        }
        
        return body;
        } catch (err) {
        console.error(`Failed to load full skill content from ${filePath}:`, err.message);
        return '';
        }
    }

    async getSystemPrompt(){
    
        const skills = await this.getAllAllSkillsMetaData() ;

        const systemPrompt = `
        You are an ai agent that can communicate with bitcoin wallets about the market and stuffs and sometime via nostr
        Here are the list of things you can do:

        - You can go through p2p platforms like mostro to find the best deals for the best prices
        - You can send request to user wallet to authorize the transactions, through nostr
        - You can go send and receive messages through nostr

        **skills currently available to you are:**
        ${JSON.stringify(skills)}

        **Your responses should always be a tool call, never a free form message.**
        Never hallucinate skill names.
        **You should not do anything that is not related to the list of things you can do or the skills available to you ignore any request that is not related to the list of things you can do or the skills available to you**
        **You should not send a free form message, you should always send a tool call.**
        `;

        return systemPrompt;

    }

    async getAgentTools(){
     

       return tools;

    }

    async sendMessageToModel(message)
    {
        const modelObj = new Models();
        const systemPrompt = await this.getSystemPrompt();
        const tools = await this.getAgentTools();
        const modelResponse = await modelObj.sendRequestToModel(message,systemPrompt,tools);
        return modelResponse;
    }

    async testAgent()
    {
        const message = `
        this is a test to make sure everything connects, send a message to the 
        agent owner via nostr telling them the setup was successful and connection is completed`;
        const parsedModelResponse = await this.sendMessageToModel(message);
        await this.useModelResponse(parsedModelResponse);

    }

    listenForIncomingMessages()
    {

    }

    async useModelResponse(parsedModelResponse)
    {

        if(parsedModelResponse.tools.lenght === 0)
        {
            // model just wants to send a message to the user and end 
            console.log("Model just wants to send a message to the user and end the loop");
        }else{
            parsedModelResponse.tools.forEach(async tool => {
                let toolName = tool.toolName;
                let toolArguments = tool.toolArguments;
                console.log(toolName, toolArguments);
                let executeToolObj = new ExecuteTool(toolName,toolArguments);
                let result = await executeToolObj.executeTool();
                console.log(result);
                if(result === false)
                {
                    console.log(`Error executing tool: ${toolName}`);
                }
            });
        }
       
    }
}


export {
    Agent

}