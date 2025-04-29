import { Event as TEvent, UserEvent } from "@server/types";
import CleanupDemotedUserTask from "../tasks/CleanupDemotedUserTask";
import BaseProcessor from "./BaseProcessor";

export default class UserDemotedProcessor extends BaseProcessor {
  static applicableEvents: TEvent["name"][] = ["users.demote"];

  async perform(event: UserEvent) {
    await new CleanupDemotedUserTask().schedule({ userId: event.userId });
  }
}
