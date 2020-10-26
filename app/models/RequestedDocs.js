import { computed, action } from "mobx";
import BaseModel from "models/BaseModel";

export default class RequestedDocs extends BaseModel {
    id: string;
    title: string;
    like: number;
    createdAt: ?string;
    updatedAt: ?string;
    collectionId: string;

    @computed
    get isLike(): boolean {
        return !!this.store.isLikeIds.get(this.id);
    }

    @action
    follow = () => {
        return this.store.follow(this);
    };

    @action
    unfollow = async () => {
        return this.store.unfollow(this);
    };



}
