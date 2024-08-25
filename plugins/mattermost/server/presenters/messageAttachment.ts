import { JSONObject } from "@shared/types";
import { Collection, Document, Team } from "@server/models";

export const presentMessageAttachment = ({
  document,
  team,
  collection,
}: {
  document: Document;
  team: Team;
  collection?: Collection | null;
}): JSONObject => {
  const text = document.getSummary();

  return {
    color: collection?.color,
    title: document.title,
    title_link: `${team.url}${document.path}`,
    text,
    footer: collection?.name,
  };
};
