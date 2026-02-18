# Current branch instructions

Currently in the app we are letting the user create a Client and then we expect him to add the Client's campaigns.

But would be much better, if they have already defined the windsor API Key (`WINDSOR_DEFAULT_API_KEY`), fetch all the list of Clients/Accounts and Campaigns from [windsor API](https://windsor.ai/api-documentation/) for them after they press a button in the UI (e.g. Fetch all Clients and Campaigns) or if they ask Sentinel via Slack chat (any channel, not necessary one already associated with a Client).

When automatically fetching Clients we would we try to match and associate the Campaigns to the correct Client.

After a Client is created in the system the user can associated it with a Slack channel using the Slack Channel Id (same as it is right now).

Would be good to let them the option to manual create Clients and Campaigns as it is, also the option to update them or remove them from the system (same as it is).

We already have a MCP module located in: `sentinel-api/src/modules/mcp`

We have a windsor API methods definition defeined in: `sentinel-api/src/modules/shared/facebook/windsor.client.ts` but we are lacking some new methods to get all clients and campaigns generically (not already associated with a manually created Client)

We also need to improve the Slack Bot module (sentinel-api/src/modules/slack-bot) to allow the new "fetch all clients / campaigns" action using natural language.