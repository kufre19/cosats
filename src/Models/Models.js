import fs from 'fs';
import { input, confirm, select, Separator } from '@inquirer/prompts';
import models from './models.json' with {type: "json"};
import { configKey } from './constants.js';
import {Agent} from '../Agent/Agent.js';


class Models {
    modelConfig = null;
    modelApiKey = null;

    
  

    async initModel(){
      
        // step 1 load the configs
        this.loadModelConfig();
        // step 2 loop through the config to check for null values for a key, 
        // check condition needed to request for its value
        for(const key in this.modelConfig){
        
            if(this.modelConfig[key] === null){
                const request = await this.requestModelConfig(key);
            }
        }

        // lets collect and instatiate the api key if it exists
         await this.getModelApiKey()
    

        // step 3 send the agent.md file to the model to establish connection test.
        const message = `
        this is a test to make sure everything connects, send a message to the 
        agent owner via nostr telling them the setup was successful and connection is completed`;
        let response  = await this.sendRequestToModel(message);
        console.log(JSON.stringify(response));

        // step 4 put the program in a loop that waits for response from ai or gets a message from the owner via nostr 
     
        
    }
    loadModelConfig(){
        this.modelConfig = JSON.parse(fs.readFileSync('model_config.json', 'utf8'));
    }

      // update agentconfig 
      updateModelConfig(key, value){
        if(key == configKey.MODEL_PROVIDER)
        {
            if(!this.modelApiKeyExists())
            {
                this.modelConfig[configKey.MODEL_API_KEY] = null;
            }
           
        }
        if(key == configKey.MODEL_API_KEY)
        {
            this.setModelApiKey(value,this.modelConfig[configKey.MODEL_PROVIDER]);
            value = true;
        }
        this.modelConfig[key] = value
        fs.writeFileSync('model_config.json', JSON.stringify(this.modelConfig, null, 2), 'utf8');
        console.log(`Model config updated: ${key} = ${value}`);
      }

    // request for model config value
   async requestModelConfig(ConfigKey){
        switch(ConfigKey){
            case configKey.MODEL_ENVIRONMENT:
                const ModelEnv = await select({
                    message: "Select the model environment",
                    choices: ["local", "online"]
                });
                this.updateModelConfig(ConfigKey,ModelEnv)
                break;
            case configKey.MODEL_PROVIDER:
                const modelProvider = await select({
                    message: "Select the model provider:",
                    choices: Object.keys(models[this.modelConfig["model_environment"]])
                })
                this.updateModelConfig(ConfigKey,modelProvider)
                break;
            case configKey.MODEL_NAME:
                const modelName = await select({
                    message: "Select a model",
                    choices: models[this.modelConfig["model_environment"]][this.modelConfig["model_provider"]]
                })
                this.updateModelConfig(ConfigKey,modelName)
                break;
            case configKey.MODEL_API_ENDPOINT:
                const modelApiEndpoint = await input({
                    message: "Enter the model api endpoint:"
                })
                this.updateModelConfig(ConfigKey,modelApiEndpoint)
                break;

            case configKey.MODEL_API_KEY:
                if(this.modelConfig["model_environment"] != "local")
                {
                    const modelApiKey = await input({
                        message: "Enter the model api key:"
                    })
                    this.updateModelConfig(ConfigKey,modelApiKey)
                }
               
                break;
            default:
                console.log(`Invalid config key: ${ConfigKey}`);
                break;
            
        }

    }

    modelApiKeyExists(){
        const keys = JSON.parse(fs.readFileSync('keys/model_keys.json','utf8'));
        return Object.hasOwn(keys,this.modelConfig[configKey.MODEL_PROVIDER]);
    }

    async getModelApiKey(){
        
        if(this.modelApiKeyExists())
        {
            const keys = JSON.parse(fs.readFileSync('keys/model_keys.json','utf8'));
            this.modelApiKey = keys[this.modelConfig[configKey.MODEL_PROVIDER]];
        }
    }

    setModelApiKey(apiKey,provider){
        const keys = JSON.parse(fs.readFileSync('keys/model_keys.json','utf8'));
        keys[provider] = apiKey;
        fs.writeFileSync('keys/model_keys.json', JSON.stringify(keys, null, 2), 'utf8');

    }

    // method to be called to use existing tools
    useTool(tool){

    }

    // Method to parse the response sent from the model
    parseResponse(){

    }

    // test connection to model 
    // this will send a message to the model to use the nostr tool to 
    // send a connection complete message to agent owner 
    confirmModelConnection()
    {

    }

    loadAllSkills(){

    }




    async sendRequestToModel(message) {
        let headers = {};
        let body ={};
        const agentObj = new Agent();
        const url = this.modelConfig[configKey.MODEL_API_ENDPOINT];
        const skills = await agentObj.getAllAllSkillsMetaData() ;

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

        const systemPromptObj = {role:'system', content: systemPrompt}


        const tools = [
            {
              type: "function",
              function:{
                    name: "use_skill",
                    description: "Activate a specific skill. Only call this when you are sure the user's request matches the skill, or you need to make a request or process certain data ",
                    parameters: {
                        type: "object",
                        properties: {
                            skill_name: { type: "string", enum: skills.map(s => s.name) },
                            skill_parameters: { type: "object", description: "determine the parameter that should be passed into this skill based on the available skills to you and the request" },
                        },
                        required: ["skill_name","skill_parameters"],
                    },
                }
            }
        ];
          


        switch (this.modelConfig[configKey.MODEL_PROVIDER]) {
            case "openai":
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.modelApiKey}`
                }
                body = {
                    model: this.modelConfig[configKey.MODEL_NAME],
                    messages: [
                        systemPromptObj,
                        {role: 'user', content: message}
                        
                    ],
                    tools: tools,
                    tool_choice: "auto"
                   }
                
                break;
        
            default:
                break;
        }
        
       
        // console.log(tools);
        // return ;
    
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });


    
        const data = await response.json();
        return data;
    }

  
}


const ModelObj = new Models();
ModelObj.initModel()


export {
    ModelObj
}