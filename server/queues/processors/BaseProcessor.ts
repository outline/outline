import { Event } from "@server/types";

export default abstract class BaseProcessor {
  static applicableEvents: (Event["name"] | "*")[] = [];

  public abstract perform(event: Event): Promise<void>;
}
