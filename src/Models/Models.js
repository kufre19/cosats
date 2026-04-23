import fs from 'fs';
import { input, confirm, select, Separator } from '@inquirer/prompts';
import models from './models.json' with {type: "json"};
import { configKey } from './constants.js';
import { Adapter } from './Adapter.js';


class Models {
    modelConfig = null;
    modelApiKey = null;

    constructor()
    {
        this.loadModelConfig();
        this.getModelApiKey()

    }

    
  

    async initModel(){
      
        // step 1 load the configs
        // this.loadModelConfig();
        // step 2 loop through the config to check for null values for a key, 
        // check condition needed to request for its value
        for(const key in this.modelConfig){
        
            if(this.modelConfig[key] === null){
                const request = await this.requestModelConfig(key);
            }
        }

        // lets collect and instatiate the api key if it exists
        this.getModelApiKey();
        
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

    getModelApiKey(){
        
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




    async sendRequestToModel(message,systemPrompt,tools) {
       

        const modelAdapter = new Adapter(this.modelConfig,systemPrompt,tools,this.modelApiKey);
        let modelResponse = await modelAdapter.promptModel(message);
        return modelResponse;
    }

  
}


export {
    Models
}