import { computed, observable } from "mobx";
import type GroupMembership from "./GroupMembership";
import Model from "./base/Model";
import Field from "./decorators/Field";
import { GroupPermission } from "@shared/types";
import type { Searchable } from "./interfaces/Searchable";

/**
 * Information about a group that is managed by an external provider.
 */
interface ExternalGroupInfo {
  /** The unique identifier of the external group record in Outline. */
  id: string;
  /** The unique identifier of the group in the external provider. */
  externalId: string;
  /** The name of the external provider (e.g. google, slack, azure). */
  provider: string;
  /** The display name of the group in the external provider. */
  displayName: string;
  /** The date and time the group was last synced from the external provider. */
  lastSyncedAt: string | null;
}

class Group extends Model implements Searchable {
  static modelName = "Group";

  @Field
  @observable
  name: string;

  @Field
  @observable
  description: string;

  @observable
  externalId: string | undefined;

  @observable
  memberCount: number;

  @Field
  @observable
  disableMentions: boolean;

  @observable
  externalGroup: ExternalGroupInfo | undefined;

  /**
   * Whether this group's membership is managed by an external authentication provider.
   */
  @computed
  get isExternallyManaged(): boolean {
    return !!this.externalGroup;
  }

  /**
   * Returns the users that are members of this group.
   */
  @computed
  get users() {
    const { users } = this.store.rootStore;
    return users.inGroup(this.id);
  }

  @computed
  get searchContent(): string[] {
    return [this.name, this.description].filter(Boolean);
  }

  @computed
  get searchSuppressed(): boolean {
    return this.disableMentions;
  }

  @computed
  get admins() {
    const { groupUsers } = this.store.rootStore;
    return groupUsers.orderedData
      .filter(
        (groupUser) =>
          groupUser.groupId === this.id &&
          groupUser.permission === GroupPermission.Admin
      )
      .map((groupUser) => groupUser.user);
  }

  /**
   * Returns the direct memberships that this group has to documents. Documents that the current
   * user already has access to through a collection, archived, and trashed documents are not included.
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
        return !policy?.abilities?.readDocument && !!document?.isActive;
      });
  }
}

export default Group;
