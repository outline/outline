// @flow
const template = `# Welcome to Outline

Outline a place for your team to build your knowledge base. This can include:

* Team wiki
* Documentation
* Playbooks
* Employee onboarding

...and anything you can think of.

## 🖋 Editor to fit your needs

![Text formatting in Outline](https://s3.amazonaws.com/dev.beautifulatlas.com/uploads/e2b85962-ca66-4e4c-90d3-b32d30f0610c/754830c0-2aca-467c-82de-2fd6e990b696/Group.png)

Outline's editor is build to be fast and extensible. You can easily format your documents with keyboard shortcuts or simply highlighting the text and making your selections. To add images, just drag and drop them to your canvas.

Like many developers, we love [Markdown](http://commonmark.org/help/) and you can format your Outline documents by writing Markdown it will get formatted without the need for previews.

## 👩‍💻 Developer friendly

Outline features an [open API](https://www.getoutline.com/developers) and syntax highlighting which makes it ideal for software teams. To create your first document using the API, create an API key in [settings](https://www.getoutline.com/settings/tokens) and  run the following Javascript code. Just remember to update your API key and keep it secure!

\`\`\`
const newDocument = {
  title: 'Getting started with codebase',
  text: 'All the information needed in Markdown',
  collection: 'COLLECTION_ID',
  token: 'API_KEY', // Replace with a key from https://www.getoutline.com/settings/tokens
};

fetch('https://www.getoutline.com/api/documents.create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(newDocument),
});
\`\`\`

## 💬 Say hi to the team

Outline is build by a small team and we would love to get to get to know our users. Drop by at [our Spectrum community](https://spectrum.chat/outline) or [drop us an email](mailto:hello@getoutline.com).
`;

export const welcomeMessage = collectionId =>
  template.replace('COLLECTION_ID', collectionId);
