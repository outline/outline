import * as Sentry from "@sentry/react";
import invariant from "invariant";
import { observable, action, computed, autorun, runInAction } from "mobx";
import { getCookie, setCookie, removeCookie } from "tiny-cookie";
import { CustomTheme, TeamPreferences, UserPreferences } from "@shared/types";
import Storage from "@shared/utils/Storage";
import { getCookieDomain, parseDomain } from "@shared/utils/domains";
import RootStore from "~/stores/RootStore";
import Policy from "~/models/Policy";
import Team from "~/models/Team";
import User from "~/models/User";
import env from "~/env";
import { client } from "~/utils/ApiClient";
import Desktop from "~/utils/Desktop";
import Logger from "~/utils/Logger";

const AUTH_STORE = "AUTH_STORE";
const NO_REDIRECT_PATHS = ["/", "/create", "/home", "/logout"];

type PersistedData = {
  user?: User;
  team?: Team;
  collaborationToken?: string;
  availableTeams?: {
    id: string;
    name: string;
    avatarUrl: string;
    url: string;
    isSignedIn: boolean;
  }[];
  policies?: Policy[];
};

type Provider = {
  id: string;
  name: string;
  authUrl: string;
};

export type Config = {
  name?: string;
  logo?: string;
  customTheme?: Partial<CustomTheme>;
  hostname?: string;
  providers: Provider[];
};

export default class AuthStore {
  /* The user that is currently signed in. */
  @observable
  user?: User | null;

  /* The team that the current user is signed into. */
  @observable
  team?: Team | null;

  /* A short-lived token to be used to authenticate with the collaboration server. */
  @observable
  collaborationToken?: string | null;

  /* A list of teams that the current user has access to. */
  @observable
  availableTeams?: {
    id: string;
    name: string;
    avatarUrl: string;
    url: string;
    isSignedIn: boolean;
  }[];

  /* A list of cancan policies for the current user. */
  @observable
  policies: Policy[] = [];

  /* The authentication provider the user signed in with. */
  @observable
  lastSignedIn?: string | null;

  /* Whether the user is currently saving their profile or team settings. */
  @observable
  isSaving = false;

  @observable
  isFetching = true;

  /* Whether the user is currently suspended. */
  @observable
  isSuspended = false;

  /* The email address to contact if the user is suspended. */
  @observable
  suspendedContactEmail?: string | null;

  /* The auth configuration for the current domain. */
  @observable
  config: Config | null | undefined;

  rootStore: RootStore;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
    // attempt to load the previous state of this store from localstorage
    const data: PersistedData = Storage.get(AUTH_STORE) || {};

    this.rehydrate(data);
    void this.fetch();

    // persists this entire store to localstorage whenever any keys are changed
    autorun(() => {
      Storage.set(AUTH_STORE, this.asJson);
    });

    // listen to the localstorage value changing in other tabs to react to
    // signin/signout events in other tabs and follow suite.
    window.addEventListener("storage", (event) => {
      if (event.key === AUTH_STORE && event.newValue) {
        const data: PersistedData | null | undefined = JSON.parse(
          event.newValue
        );
        // data may be null if key is deleted in localStorage
        if (!data) {
          return;
        }

        // If we're not signed in then hydrate from the received data, otherwise if
        // we are signed in and the received data contains no user then sign out
        if (this.authenticated) {
          if (data.user === null) {
            void this.logout(false, false);
          }
        } else {
          this.rehydrate(data);
        }
      }
    });
  }

  @action
  rehydrate(data: PersistedData) {
    this.user = data.user ? new User(data.user, this) : undefined;
    this.team = data.team ? new Team(data.team, this) : undefined;
    this.collaborationToken = data.collaborationToken;
    this.lastSignedIn = getCookie("lastSignedIn");
    this.addPolicies(data.policies);
  }

  addPolicies(policies?: Policy[]) {
    if (policies) {
      // cache policies in this store so that they are persisted between sessions
      this.policies = policies;
      policies.forEach((policy) => this.rootStore.policies.add(policy));
    }
  }

  @computed
  get authenticated(): boolean {
    return !!this.user && !!this.team;
  }

  @computed
  get asJson() {
    return {
      user: this.user,
      team: this.team,
      collaborationToken: this.collaborationToken,
      availableTeams: this.availableTeams,
      policies: this.policies,
    };
  }

  @action
  fetchConfig = async () => {
    const res = await client.post("/auth.config");
    invariant(res?.data, "Config not available");
    this.config = res.data;
  };

  @action
  fetch = async () => {
    this.isFetching = true;

    try {
      const res = await client.post("/auth.info", undefined, {
        credentials: "same-origin",
      });
      invariant(res?.data, "Auth not available");
      runInAction("AuthStore#fetch", () => {
        this.addPolicies(res.policies);
        const { user, team } = res.data;
        this.user = new User(user, this);
        this.team = new Team(team, this);
        this.availableTeams = res.data.availableTeams;
        this.collaborationToken = res.data.collaborationToken;

        if (env.SENTRY_DSN) {
          Sentry.configureScope(function (scope) {
            scope.setUser({
              id: user.id,
            });
            scope.setExtra("team", team.name);
            scope.setExtra("teamId", team.id);
          });
        }

        // Redirect to the correct custom domain or team subdomain if needed
        // Occurs when the (sub)domain is changed in admin and the user hits an old url
        const { hostname, pathname } = window.location;

        if (this.team.domain) {
          if (this.team.domain !== hostname) {
            window.location.href = `${team.url}${pathname}`;
            return;
          }
        } else if (
          env.SUBDOMAINS_ENABLED &&
          parseDomain(hostname).teamSubdomain !== (team.subdomain ?? "")
        ) {
          window.location.href = `${team.url}${pathname}`;
          return;
        }

        // If we came from a redirect then send the user immediately there
        const postLoginRedirectPath = getCookie("postLoginRedirectPath");

        if (postLoginRedirectPath) {
          removeCookie("postLoginRedirectPath");

          if (!NO_REDIRECT_PATHS.includes(postLoginRedirectPath)) {
            window.location.href = postLoginRedirectPath;
          }
        }
      });
    } catch (err) {
      if (err.error === "user_suspended") {
        this.isSuspended = true;
        this.suspendedContactEmail = err.data.adminEmail;
        return;
      }
    } finally {
      this.isFetching = false;
    }
  };

  requestDeleteUser = () => client.post(`/users.requestDelete`);

  requestDeleteTeam = () => client.post(`/teams.requestDelete`);

  @action
  deleteUser = async (data: { code: string }) => {
    await client.post(`/users.delete`, data);
    runInAction("AuthStore#deleteUser", () => {
      this.user = null;
      this.team = null;
      this.collaborationToken = null;
      this.availableTeams = this.availableTeams?.filter(
        (team) => team.id !== this.team?.id
      );
      this.policies = [];
    });
  };

  @action
  deleteTeam = async (data: { code: string }) => {
    await client.post(`/teams.delete`, data);
    runInAction("AuthStore#deleteTeam", () => {
      this.user = null;
      this.availableTeams = this.availableTeams?.filter(
        (team) => team.id !== this.team?.id
      );
      this.policies = [];
    });
  };

  @action
  updateUser = async (params: {
    name?: string;
    avatarUrl?: string | null;
    language?: string;
    preferences?: UserPreferences;
  }) => {
    this.isSaving = true;
    const previousData = this.user?.toAPI();

    try {
      this.user?.updateFromJson(params);
      const res = await client.post(`/users.update`, params);
      invariant(res?.data, "User response not available");
      this.user?.updateFromJson(res.data);
      this.addPolicies(res.policies);
    } catch (err) {
      this.user?.updateFromJson(previousData);
      throw err;
    } finally {
      this.isSaving = false;
    }
  };

  @action
  updateTeam = async (params: {
    name?: string;
    avatarUrl?: string | null | undefined;
    sharing?: boolean;
    defaultCollectionId?: string | null;
    subdomain?: string | null | undefined;
    allowedDomains?: string[] | null | undefined;
    preferences?: TeamPreferences;
  }) => {
    this.isSaving = true;
    const previousData = this.team?.toAPI();

    try {
      this.team?.updateFromJson(params);
      const res = await client.post(`/team.update`, params);
      invariant(res?.data, "Team response not available");
      this.team?.updateFromJson(res.data);
      this.addPolicies(res.policies);
    } catch (err) {
      this.team?.updateFromJson(previousData);
      throw err;
    } finally {
      this.isSaving = false;
    }
  };

  @action
  createTeam = async (params: { name: string }) => {
    this.isSaving = true;

    try {
      const res = await client.post(`/teams.create`, params);
      invariant(res?.success, "Unable to create team");

      window.location.href = res.data.transferUrl;
    } finally {
      this.isSaving = false;
    }
  };

  @action
  logout = async (
    /** Whether the current path should be saved and returned to after login */
    savePath = false,
    /**
     * Whether the auth token should attempt to be revoked, this should be disabled
     * with requests from ApiClient to prevent infinite loops.
     */
    tryRevokingToken = true
  ) => {
    // if this logout was forced from an authenticated route then
    // save the current path so we can go back there once signed in
    if (savePath) {
      const pathName = window.location.pathname;

      if (!NO_REDIRECT_PATHS.includes(pathName)) {
        setCookie("postLoginRedirectPath", pathName);
      }
    }

    if (tryRevokingToken) {
      try {
        // invalidate authentication token on server and unset auth cookie
        await client.post(`/auth.delete`);
      } catch (err) {
        Logger.error("Failed to delete authentication", err);
      }
    }

    // remove session record on apex cookie
    const team = this.team;

    if (team) {
      const sessions = JSON.parse(getCookie("sessions") || "{}");
      delete sessions[team.id];
      setCookie("sessions", JSON.stringify(sessions), {
        domain: getCookieDomain(window.location.hostname),
      });
    }

    // clear all credentials from cache (and local storage via autorun)
    this.user = null;
    this.team = null;
    this.collaborationToken = null;
    this.policies = [];

    // Tell the host application we logged out, if any – allows window cleanup.
    void Desktop.bridge?.onLogout?.();
    this.rootStore.logout();
  };
}
