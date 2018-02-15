// @flow
import { Document } from '../models';

function present(document: Document) {
  return {
    color: document.collection.color,
    title: document.title,
    title_link: `${process.env.URL}${document.getUrl()}`,
    footer: document.collection.name,
    text: document.getSummary(),
    ts: document.getTimestamp(),
  };
}

export default present;
