import { configKey } from "./constants.js";

/**
 * Adapter class is used in sending message to models and parsing them based on the model provider in the model config 
 */

class Adapter{
    provider = {};
    systemPrompt;
    headers = {};
    body ={};
    tools = {};
    modelApiKey;
    modelApiEndpoint;
    constructor(provider,systemPrompt,tools,modelApiKey)
    {
        this.provider = provider;
        this.systemPrompt = systemPrompt;
        this.tools = tools;
        this.modelApiKey = modelApiKey;
    }


    // function to send request 
    async promptModel(messageToModel){

     
      
        let systemPromptObj = {};

        switch (this.provider[configKey.MODEL_PROVIDER]) {
            case "openai":
                this.headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.modelApiKey}`
                }
                systemPromptObj = {role:'system', content: this.systemPrompt};

                this.body = {
                    model: this.provider[configKey.MODEL_NAME],
                    messages: [
                        systemPromptObj,
                        {role: 'user', content: messageToModel}
                        
                    ],
                    tools: this.tools,
                    tool_choice: "auto"
                   }
                
                break;
            case "qwen":
                console.log("calling local model ");

                this.headers = {
                    'Content-Type': 'application/json'
                }
                systemPromptObj = {role:'system', content: this.systemPrompt};

                this.body = {
                    model: this.provider[configKey.MODEL_NAME],
                    messages: [
                        systemPromptObj,
                        {role: 'user', content: messageToModel}
                        
                    ],
                    tools: this.tools,
                    stream: false
                }
                break;


            default:
                break;
        }
        
       
        // console.log(this.body);
        // return ;
    
        const response = await fetch(this.provider[configKey.MODEL_API_ENDPOINT], {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(this.body)
        });


    
        const data = await response.json();
        // console.log(data);
        // return;
        return await this.parseModelResponse(data);

    }


    // function to parse request 
    async parseModelResponse(response){
        let parsedResponse = {tools:[]};
        switch (this.provider[configKey.MODEL_PROVIDER]) {
           
            case "openai":
                console.log(response);
                let message = response['choices'][0]['message'];
                parsedResponse.message = message;
                console.log(message);
   
                parsedResponse.content =  message['content'];

                parsedResponse.message['tool_calls'].forEach(tool => {
                   let tool_arguments = JSON.parse(tool.function.arguments)
                   parsedResponse.tools.push({toolName: tool.function.name, toolArguments: tool_arguments})
                    
                });

                break;

            default:
                break;

        }

        return parsedResponse;

    }


}

export {
    Adapter
}