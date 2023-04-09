import { computed, observable } from "mobx";
import { TeamPreferenceDefaults } from "@shared/constants";
import { TeamPreference, TeamPreferences } from "@shared/types";
import { stringToColor } from "@shared/utils/color";
import BaseModel from "./BaseModel";
import Field from "./decorators/Field";

class Team extends BaseModel {
  @Field
  @observable
  id: string;

  @Field
  @observable
  name: string;

  @Field
  @observable
  avatarUrl: string;

  @Field
  @observable
  sharing: boolean;

  @Field
  @observable
  inviteRequired: boolean;

  @Field
  @observable
  commenting: boolean;

  @Field
  @observable
  documentEmbeds: boolean;

  @Field
  @observable
  defaultCollectionId: string | null;

  @Field
  @observable
  memberCollectionCreate: boolean;

  @Field
  @observable
  guestSignin: boolean;

  @Field
  @observable
  subdomain: string | null | undefined;

  @Field
  @observable
  defaultUserRole: string;

  @Field
  @observable
  preferences: TeamPreferences | null;

  domain: string | null | undefined;

  url: string;

  @Field
  @observable
  allowedDomains: string[] | null | undefined;

  @computed
  get signinMethods(): string {
    return "SSO";
  }

  @computed
  get color(): string {
    return stringToColor(this.id);
  }

  @computed
  get initial(): string {
    return this.name ? this.name[0] : "?";
  }

  /**
   * Returns whether this team is using a separate editing mode behind an "Edit"
   * button rather than seamless always-editing.
   *
   * @returns True if editing mode is seamless (no button)
   */
  @computed
  get seamlessEditing(): boolean {
    return !!this.getPreference(TeamPreference.SeamlessEdit);
  }

  /**
   * Returns the value of the provided preference.
   *
   * @param preference The team preference to retrieve
   * @returns The preference value if set, else the default value
   */
  getPreference<T extends keyof TeamPreferences>(
    key: T
  ): TeamPreferences[T] | false {
    return this.preferences?.[key] ?? TeamPreferenceDefaults[key] ?? false;
  }

  /**
   * Set the value for a specific preference key.
   *
   * @param key The TeamPreference key to retrieve
   * @param value The value to set
   */
  setPreference(key: TeamPreference, value: boolean) {
    this.preferences = {
      ...this.preferences,
      [key]: value,
    };
  }
}

export default Team;
