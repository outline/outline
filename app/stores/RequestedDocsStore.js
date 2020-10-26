// @flow
import invariant from "invariant";
import naturalSort from "shared/utils/naturalSort";
import { observable, action, runInAction, computed } from "mobx";
import RequestedDocs from "models/RequestedDocs"
import {
    orderBy,
    filter,
    sortBy,
} from "lodash";

import BaseStore from "./BaseStore";
import RootStore from "./RootStore";
import { client } from "utils/ApiClient";

export default class RequestedDocsStore extends BaseStore<RequestedDocs>{
    @observable isLikeIds: Map<string, boolean> = new Map();

    constructor(rootStore: RootStore) {
        super(rootStore, RequestedDocs);
    }

    @action
    async create(requestedocs: RequestedDocs) {
        const res = await client.post("/requesteddocs.create", {
            title: requestedocs.title,
            collectionId: requestedocs.collectionId,
            id: requestedocs.id,
        });

        invariant(res && res.data, "Data should be available");

        this.addPolicies(res.policies);
        return this.add(res.data);
    }

    follow = async (id) => {
        this.isLikeIds.set(id, true);

        try {
            return client.post("/requesteddocs.follow", { id });
        } catch (err) {
            this.isLikeIds.set(id, false);
        }

    };

    unfollow = (id) => {
        this.isLikeIds.set(id, false);
        try {
            return client.post("/requesteddocs.unfollow", { id });
        } catch (err) {
            this.isLikeIds.set(id, false);
        }
    };


    @action
    fetchPage = async (requestedocs: ?PaginationParams): Promise<*> => {
        this.isFetching = true;

        try {
            const res = await client.post(`/requesteddocs.list`, requestedocs);

            invariant(res && res.data, "Data not available");
            const { data } = res;

            runInAction(`RequestedDocsStore#fetchPage`, () => {
                data.forEach(this.add);
                this.isLoaded = true;
            });
            return res.data;

        } finally {
            this.isFetching = false;
        }
    };


    @computed
    get orderedData(): RequestedDocs[] {
        return sortBy(Array.from(this.data.values()), "like", "DESC").reverse();
        // return naturalSort(Array.from(this.data.values()), "title");
    };

}