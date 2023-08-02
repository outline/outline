import { subMinutes } from "date-fns";
import { computed, action, observable } from "mobx";
import { now } from "mobx-utils";
import { UserPreferenceDefaults } from "@shared/constants";
import {
  NotificationEventDefaults,
  NotificationEventType,
  UserPreference,
  UserPreferences,
} from "@shared/types";
import type { Role, NotificationSettings } from "@shared/types";
import { client } from "~/utils/ApiClient";
import ParanoidModel from "./ParanoidModel";
import Field from "./decorators/Field";

class User extends ParanoidModel {
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

  email: string;

  isAdmin: boolean;

  isViewer: boolean;

  lastActiveAt: string;

  isSuspended: boolean;

  @computed
  get initial(): string {
    return this.name ? this.name[0] : "?";
  }

  @computed
  get isInvited(): boolean {
    return !this.lastActiveAt;
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

  @computed
  get role(): Role {
    if (this.isAdmin) {
      return "admin";
    } else if (this.isViewer) {
      return "viewer";
    } else {
      return "member";
    }
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
  getPreference(key: UserPreference): boolean {
    return this.preferences?.[key] ?? UserPreferenceDefaults[key] ?? false;
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
}

export default User;
