import { computed } from "mobx";
import Emoji from "~/models/Emoji";
import RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

export default class EmojisStore extends Store<Emoji> {
  actions = [
    RPCAction.List,
    RPCAction.Create,
    RPCAction.Update,
    RPCAction.Delete,
  ];

  constructor(rootStore: RootStore) {
    super(rootStore, Emoji);
  }

  @computed
  get teamEmojis() {
    const teamId = this.rootStore.auth.team?.id;
    return teamId
      ? this.orderedData.filter((emoji) => emoji.teamId === teamId)
      : [];
  }

  @computed
  get emojisByName() {
    return this.teamEmojis.reduce((acc, emoji) => {
      acc[emoji.name] = emoji;
      return acc;
    }, {} as Record<string, Emoji>);
  }
}
