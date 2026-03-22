---
name: use-nostr
description: sends and retrive message from the nostr network.
---

# Send and Retrive messages from the Nostr network

## When to use this skill
Use this skill when the agent wants to send a message to the owner or wants to retrive specific messages from the nostr network

## How to use it
1.  **Form a response/request message**: First make sure you have a clear response to a request from the owner or form a request message you want to send to the owner .
2.  **Run the node script send-nostr-message with your message as the parameter**: Run the `scripts/send-nostr-message` script with the required parameters.

**Example Command:**
```node
./scripts/send-nostr-message --message "there's a bitcoin sell order that's profitable currently active on Mostro here's the info....."