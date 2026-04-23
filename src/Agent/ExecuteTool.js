import { Nostr } from '../nostr/Nostr.js';


class ExecuteTool{
    toolName;
    toolArguments;
    constructor(toolName,toolArguments)
    {
        this.toolName = toolName;
        this.toolArguments = toolArguments;
    }

    async executeTool()
    {
        switch(this.toolName)
        {
            case "sendMessage":
                const nostrObj = new Nostr();
                const result = await nostrObj.sendMessages(this.toolArguments);
                return result === true ? true : false;

            default:
                return `Error executing tool: ${this.toolName}`;

        }
    }
    
}

export {
    ExecuteTool
}