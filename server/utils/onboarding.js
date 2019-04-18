// @flow
export const welcomeMessage = (collectionId: string) =>
  `# Welcome to Outline

Outline is a place for your team to build your knowledge base. This can include:

* Team wiki
* Documentation
* Playbooks
* Employee onboarding
* ...or anything you can think of

## 🖋 A powerful editor

![Text formatting in Outline](https://s3.amazonaws.com/dev.beautifulatlas.com/uploads/e2b85962-ca66-4e4c-90d3-b32d30f0610c/754830c0-2aca-467c-82de-2fd6e990b696/Group.png)

Outline's editor lets you easily format your documents with keyboard shortcuts, Markdown syntax or by simply highlighting the text and making your selections. To add images, just drag and drop them to your canvas.

## 👩‍💻 Developer friendly

Outline features an [API](https://www.getoutline.com/developers) for programatic document creation. To create your first document using the API, simply write it in Markdown and make a call to add it into your collection:

\`\`\`
const newDocument = {
  title: 'Getting started with codebase',
  text: 'All the information needed in Markdown',
  collectionId: '${collectionId}',
  token: 'API_KEY', // Replace with a value from https://www.getoutline.com/settings/tokens
};

fetch('https://www.getoutline.com/api/documents.create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(newDocument),
});
\`\`\`

## 👋 Say hi to the team

Outline is built by a small team and we would love to get to know our users. Drop by at [our Spectrum community](https://spectrum.chat/outline) or [drop us an email](mailto:hello@getoutline.com).
`;
