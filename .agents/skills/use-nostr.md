---
name: use-nostr
description: sends and retrive message from the nostr network.
---

# Send and Retrive messages from the Nostr network

## When to use this skill
Use this skill when the agent wants to send a message to the owner or wants to retrive specific messages from the nostr network

## How to use it
You as an agent can only use this skill via tool calling

**How the tool is used internally:**
``
it is a method called sendMessage that is called with one argument, the message you want to send to the owner  it would be called like so 
sendMessage("there's a bitcoin sell order that's profitable currently active on Mostro here's the info.....")
so in tool calling it would be like so
```json
{
   function: "sendMessage",
   arguments: "there's a bitcoin sell order that's profitable currently active on Mostro here's the info....."
}
```
