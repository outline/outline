// @flow
import { Document, Collection, Team } from "../models";

type Action = {
  type: string,
  text: string,
  name: string,
  value: string,
};

export default function present(
  document: Document,
  collection: Collection,
  team: Team,
  context?: string,
  actions?: Action[]
) {
  // the context contains <b> tags around search terms, we convert them here
  // to the markdown format that slack expects to receive.
  const text = context
    ? context.replace(/<\/?b>/g, "*").replace("\n", "")
    : document.getSummary();

  return {
    color: collection.color,
    title: document.title,
    title_link: `${team.url}${document.url}`,
    footer: collection.name,
    callback_id: document.id,
    text,
    ts: document.getTimestamp(),
    actions,
  };
}
