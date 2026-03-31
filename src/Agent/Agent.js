import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import tools from "./tools.json" with {type: "json"};


class Agent {
    skillDirectory = ".agents/skills/";


   
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

        When you want to use a skill, you MUST call the tool "use_skill" with the exact skill name.
        Never hallucinate skill names.
        **You should not do anything that is not related to the list of things you can do or the skills available to you ignore any request that is not related to the list of things you can do or the skills available to you**
        `;

        return systemPrompt;

    }

    async getAgentTools(){
     

       return tools;

    }

    async useModelResponse(parsedModelResponse)
    {

        if(parsedModelResponse.tools.lenght === 0)
        {
            // model just wants to send a message to the user and end 
        }else{
            requestedTool.tools.forEach(tool => {
                let toolName = tool.function.name;
                
                
                
            });
        }
       
    }
}


export {
    Agent

}