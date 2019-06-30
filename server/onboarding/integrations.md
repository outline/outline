# 🚀 Integrations & API

## Integrations

Outline supports tons of the most popular tools on the market out of the box. Just paste links to a YouTube video, Figma design, or Realtimeboard to get instant live-embeds in your documents.

Our integration code is [open-source](https://github.com/outline/outline) and we encourage third party developers and the community to build support for additional tools! Find out more on our [integrations directory](https://www.getoutline.com/integrations).

*Tip:* Most integrations work by simply pasting a link from a supported service into a document.

## Slack

If your team is using Slack to communicate then you’ll definitely want to enable our [Slack App](https://getoutline.slack.com/apps/A0W3UMKBQ-outline) to get instant link unfurling for Outline documents and access to the `/outline` slash command to search your knowledgebase from within Slack.

## API

Have some technical skills? Outline is built on a fully featured RPC-style [API](https://www.getoutline.com/developers). Create (or even append to) documents, collections, provision users, and more programmatically. All documents are edited and stored in markdown format – try out this CURL request!

```bash
curl -XPOST -H "Content-type: application/json" -d '{
  "title": "My first document",
  "text": "# My first document \n Hello from the API 👋",
  "collectionId": "COLLECTION_ID", // find the collection id in the URL bar
  "token": "API_TOKEN", // get an API token from https://www.getoutline.com/settings/tokens
  "publish": true
}' 'https://www.getoutline.com/api/documents.create'
```

