import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';


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
}


export {
    Agent

}