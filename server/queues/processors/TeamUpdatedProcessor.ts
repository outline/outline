import { TeamPreference } from "@shared/types";
import type { Event as TEvent, TeamEvent } from "@server/types";
import RevokeDynamicOAuthClientsTask from "../tasks/RevokeDynamicOAuthClientsTask";
import BaseProcessor from "./BaseProcessor";

export default class TeamUpdatedProcessor extends BaseProcessor {
  static applicableEvents: TEvent["name"][] = ["teams.update"];

  async perform(event: TeamEvent) {
    // Dynamically registered clients exist only to serve MCP, so their
    // outstanding access is revoked when the workspace turns the feature off.
    if (event.changes?.attributes.preferences?.[TeamPreference.MCP] === false) {
      await new RevokeDynamicOAuthClientsTask().schedule({
        teamId: event.teamId,
      });
    }
  }
}
