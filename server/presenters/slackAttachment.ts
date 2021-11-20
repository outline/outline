import { Document, Collection, Team } from "@server/models";

type Action = {
  type: string;
  text: string;
  name: string;
  value: string;
};

export default function present(
  document: Document,
  // @ts-expect-error ts-migrate(2749) FIXME: 'Collection' refers to a value, but is being used ... Remove this comment to see the full error message
  collection: Collection,
  // @ts-expect-error ts-migrate(2749) FIXME: 'Team' refers to a value, but is being used as a t... Remove this comment to see the full error message
  team: Team,
  context?: string,
  actions?: Action[]
) {
  // the context contains <b> tags around search terms, we convert them here
  // to the markdown format that slack expects to receive.
  const text = context
    ? context.replace(/<\/?b>/g, "*").replace(/\n/g, "")
    : // @ts-expect-error ts-migrate(2339) FIXME: Property 'getSummary' does not exist on type 'Docu... Remove this comment to see the full error message
      document.getSummary();

  return {
    color: collection.color,
    title: document.title,
    // @ts-expect-error ts-migrate(2551) FIXME: Property 'url' does not exist on type 'Document'. ... Remove this comment to see the full error message
    title_link: `${team.url}${document.url}`,
    footer: collection.name,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'Document'.
    callback_id: document.id,
    text,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'getTimestamp' does not exist on type 'Do... Remove this comment to see the full error message
    ts: document.getTimestamp(),
    actions,
  };
}
