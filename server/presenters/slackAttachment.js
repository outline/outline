// @flow
import { Document, Team } from '../models';

function present(document: Document, team: Team, context?: string) {
  // the context contains <b> tags around search terms, we convert them here
  // to the markdown format that slack expects to receive.
  const text = context
    ? context.replace(/<\/?b>/g, '*').replace('\n', '')
    : document.getSummary();

  return {
    color: document.collection.color,
    title: document.title,
    title_link: `${team.url}${document.url}`,
    footer: document.collection.name,
    text,
    ts: document.getTimestamp(),
  };
}

export default present;
