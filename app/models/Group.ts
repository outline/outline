import { computed, observable } from "mobx";
import GroupMembership from "./GroupMembership";
import Model from "./base/Model";
import Field from "./decorators/Field";

class Group extends Model {
  static modelName = "Group";

  @Field
  @observable
  name: string;

  @observable
  externalId: string | undefined;

  @observable
  memberCount: number;

  /**
   * Returns the users that are members of this group.
   */
  @computed
  get users() {
    const { users } = this.store.rootStore;
    return users.inGroup(this.id);
  }

  /**
   * Returns the direct memberships that this group has to documents. Documents that the current
   * user already has access to through a collection and trashed documents are not included.
   *
   * @returns A list of group memberships
   */
  @computed
  get documentMemberships(): GroupMembership[] {
    const { groupMemberships, groupUsers, documents, policies, auth } =
      this.store.rootStore;

    return groupMemberships.orderedData
      .filter((groupMembership) =>
        groupUsers.orderedData.some(
          (groupUser) =>
            groupUser.groupId === groupMembership.groupId &&
            groupUser.userId === auth.user?.id
        )
      )
      .filter(
        (m) => m.groupId === this.id && m.sourceId === null && m.documentId
      )
      .filter((m) => {
        const document = documents.get(m.documentId!);
        const policy = document?.collectionId
          ? policies.get(document.collectionId)
          : undefined;
        return !policy?.abilities?.readDocument && !document?.isDeleted;
      });
  }
}

export default Group;
