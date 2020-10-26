// @flow
import { reduce, filter, find, orderBy } from "lodash";
import invariant from "invariant";
import naturalSort from "shared/utils/naturalSort";
import { observable, action, runInAction, computed } from "mobx";
import RequestedDocs from "models/RequestedDocs"
import Follow from "../models/Follow"
import { client } from "utils/ApiClient";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";

export default class FollowsStore extends BaseStore<Follow>{
    actions = ["list"];
    @observable isLikeIds: Map<string, boolean> = new Map();

    constructor(rootStore: RootStore) {
        super(rootStore, Follow);
    }

    listFollow(requestedDocId: string): Follow[] {
        return orderBy(
            filter(this.orderedData, (follow) => follow.requestedDocId === requestedDocId),
            "lastViewedAt",
            "DESC"
        );
    }


    countForRequestedDocFollow(requestedDocId: string): number {
        const follows = this.listFollow(requestedDocId);
        return reduce(follows, (memo, follow) => memo + follow.count, 0);
    }

    touch(requestedDocId: string, userId: string) {
        const follow = find(
            this.orderedData,
            (follow) => follow.requestedDocId === requestedDocId && follow.userId === userId
        );
        if (!follow) return;
        follow.touch();
    }

}

