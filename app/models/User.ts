import { subMinutes } from "date-fns";
import { computed, action, observable } from "mobx";
import { now } from "mobx-utils";
import { UserPreferenceDefaults } from "@shared/constants";
import {
  NotificationEventDefaults,
  NotificationEventType,
  TeamPreference,
  UserPreference,
  UserPreferences,
  UserRole,
} from "@shared/types";
import type { NotificationSettings } from "@shared/types";
import { client } from "~/utils/ApiClient";
import Document from "./Document";
import UserMembership from "./UserMembership";
import ParanoidModel from "./base/ParanoidModel";
import Field from "./decorators/Field";

class User extends ParanoidModel {
  static modelName = "User";

  @Field
  @observable
  id: string;

  @Field
  @observable
  avatarUrl: string;

  @Field
  @observable
  name: string;

  @Field
  @observable
  color: string;

  @Field
  @observable
  language: string;

  @Field
  @observable
  preferences: UserPreferences | null;

  @Field
  @observable
  notificationSettings: NotificationSettings;

  @observable
  email: string;

  @observable
  role: UserRole;

  @observable
  lastActiveAt: string;

  @observable
  isSuspended: boolean;

  @computed
  get initial(): string {
    return (this.name ? this.name[0] : "?").toUpperCase();
  }

  /**
   * Whether the user has been invited but not yet signed in.
   */
  get isInvited(): boolean {
    return !this.lastActiveAt;
  }

  /**
   * Whether the user is an admin.
   */
  get isAdmin(): boolean {
    return this.role === UserRole.Admin;
  }

  /**
   * Whether the user is a member (editor).
   */
  get isMember(): boolean {
    return this.role === UserRole.Member;
  }

  /**
   * Whether the user is a viewer.
   */
  get isViewer(): boolean {
    return this.role === UserRole.Viewer;
  }

  /**
   * Whether the user is a guest.
   */
  get isGuest(): boolean {
    return this.role === UserRole.Guest;
  }

  /**
   * Whether the user has been recently active. Recently is currently defined
   * as within the last 5 minutes.
   *
   * @returns true if the user has been active recently
   */
  @computed
  get isRecentlyActive(): boolean {
    return new Date(this.lastActiveAt) > subMinutes(now(10000), 5);
  }

  /**
   * Returns whether this user is using a separate editing mode behind an "Edit"
   * button rather than seamless always-editing.
   *
   * @returns True if editing mode is seamless (no button)
   */
  @computed
  get separateEditMode(): boolean {
    return !this.getPreference(
      UserPreference.SeamlessEdit,
      this.store.rootStore.auth?.team?.getPreference(
        TeamPreference.SeamlessEdit
      )
    );
  }

  @computed
  get memberships(): UserMembership[] {
    return this.store.rootStore.userMemberships.orderedData
      .filter(
        (m) => m.userId === this.id && m.sourceId === null && m.documentId
      )
      .filter((m) => {
        const document = this.store.rootStore.documents.get(m.documentId!);
        const policy = document?.collectionId
          ? this.store.rootStore.policies.get(document.collectionId)
          : undefined;
        return !policy?.abilities?.readDocument;
      });
  }

  /**
   * Returns the current preference for the given notification event type taking
   * into account the default system value.
   *
   * @param type The type of notification event
   * @returns The current preference
   */
  public subscribedToEventType = (type: NotificationEventType) =>
    this.notificationSettings[type] ?? NotificationEventDefaults[type] ?? false;

  /**
   * Sets a preference for the users notification settings on the model and
   * saves the change to the server.
   *
   * @param type The type of notification event
   * @param value Set the preference to true/false
   */
  @action
  setNotificationEventType = async (
    eventType: NotificationEventType,
    value: boolean
  ) => {
    this.notificationSettings = {
      ...this.notificationSettings,
      [eventType]: value,
    };

    if (value) {
      await client.post(`/users.notificationsSubscribe`, {
        eventType,
      });
    } else {
      await client.post(`/users.notificationsUnsubscribe`, {
        eventType,
      });
    }
  };

  /**
   * Get the value for a specific preference key, or return the fallback if
   * none is set.
   *
   * @param key The UserPreference key to retrieve
   * @returns The value
   */
  getPreference(key: UserPreference, defaultValue = false): boolean {
    return (
      this.preferences?.[key] ?? UserPreferenceDefaults[key] ?? defaultValue
    );
  }

  /**
   * Set the value for a specific preference key.
   *
   * @param key The UserPreference key to retrieve
   * @param value The value to set
   */
  setPreference(key: UserPreference, value: boolean) {
    this.preferences = {
      ...this.preferences,
      [key]: value,
    };
  }

  getMembership(document: Document) {
    return this.store.rootStore.userMemberships.orderedData.find(
      (m) => m.documentId === document.id && m.userId === this.id
    );
  }
}

export default User;
