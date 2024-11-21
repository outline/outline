import * as Sentry from "@sentry/react";
import invariant from "invariant";
import isNil from "lodash/isNil";
import { observable, action, computed, autorun, runInAction } from "mobx";
import { getCookie, setCookie } from "tiny-cookie";
import { CustomTheme } from "@shared/types";
import Storage from "@shared/utils/Storage";
import { getCookieDomain, parseDomain } from "@shared/utils/domains";
import RootStore from "~/stores/RootStore";
import Team from "~/models/Team";
import env from "~/env";
import { setPostLoginPath } from "~/hooks/useLastVisitedPath";
import { client } from "~/utils/ApiClient";
import Desktop from "~/utils/Desktop";
import Logger from "~/utils/Logger";
import isCloudHosted from "~/utils/isCloudHosted";
import Store from "./base/Store";

type PersistedData = Pick<
  AuthStore,
  "user" | "team" | "collaborationToken" | "availableTeams" | "policies"
>;

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

export default class AuthStore extends Store<Team> {
  private name = "AUTH_STORE";

  /* The ID of the user that is currently signed in. */
  @observable
  public currentUserId?: string | null;

  /* The ID of the team that is currently signed in. */
  @observable
  public currentTeamId?: string | null;

  /* A short-lived token to be used to authenticate with the collaboration server. */
  @observable
  public collaborationToken?: string | null;

  /* A list of teams that the current user has access to. */
  @observable
  public availableTeams?: {
    id: string;
    name: string;
    avatarUrl: string;
    url: string;
    isSignedIn: boolean;
  }[];

  /* The authentication provider the user signed in with. */
  @observable
  public lastSignedIn?: string | null;

  /* Whether the user is currently suspended. */
  @observable
  public isSuspended = false;

  /* The email address to contact if the user is suspended. */
  @observable
  public suspendedContactEmail?: string | null;

  /* The auth configuration for the current domain. */
  @observable
  public config: Config | null | undefined;

  rootStore: RootStore;

  constructor(rootStore: RootStore) {
    super(rootStore, Team);

    this.rootStore = rootStore;

    // attempt to load the previous state of this store from localstorage
    const data: PersistedData = Storage.get(this.name) || {};

    this.rehydrate(data);
    void this.fetchAuth();

    // persists this entire store to localstorage whenever any keys are changed
    autorun(() => {
      Storage.set(this.name, this.asJson);
    });

    // listen to the localstorage value changing in other tabs to react to
    // signin/signout events in other tabs and follow suite.
    window.addEventListener("storage", (event) => {
      if (event.key === this.name && event.newValue) {
        const newData: PersistedData | null = JSON.parse(event.newValue);

        // data may be null if key is deleted in localStorage
        if (!newData) {
          return;
        }

        // If we're not signed in then hydrate from the received data, otherwise if
        // we are signed in and the received data contains no user then sign out
        if (this.authenticated) {
          if (isNil(newData.user)) {
            void this.logout(false, false);
          }
        } else {
          this.rehydrate(newData);
        }
      }
    });
  }

  @action
  rehydrate(data: PersistedData) {
    if (data.policies) {
      this.addPolicies(data.policies);
    }
    if (data.team) {
      this.add(data.team);
    }
    if (data.user) {
      this.rootStore.users.add(data.user);
    }

    this.currentTeamId = data.team?.id;
    this.currentUserId = data.user?.id;
    this.collaborationToken = data.collaborationToken;
    this.lastSignedIn = getCookie("lastSignedIn");
  }

  /** The current user */
  @computed
  get user() {
    return this.currentUserId
      ? this.rootStore.users.get(this.currentUserId)
      : undefined;
  }

  /** The current team */
  @computed
  get team() {
    return this.currentTeamId ? this.get(this.currentTeamId) : undefined;
  }

  /** The current team's policies */
  @computed
  get policies() {
    const policy = this.currentTeamId
      ? this.rootStore.policies.get(this.currentTeamId)
      : undefined;
    return policy ? [policy] : [];
  }

  /** Whether the user is signed in */
  @computed
  get authenticated(): boolean {
    return !!this.user && !!this.team;
  }

  @computed
  get asJson(): PersistedData {
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
  fetchAuth = async () => {
    this.isFetching = true;

    try {
      const res = await client.post("/auth.info", undefined, {
        credentials: "same-origin",
      });
      invariant(res?.data, "Auth not available");

      runInAction("AuthStore#refresh", () => {
        const { data } = res;
        this.addPolicies(res.policies);
        this.add(data.team);
        this.rootStore.users.add(data.user);
        data.groups.map(this.rootStore.groups.add);
        data.groupUsers.map(this.rootStore.groupUsers.add);
        this.currentUserId = data.user.id;
        this.currentTeamId = data.team.id;

        this.availableTeams = res.data.availableTeams;
        this.collaborationToken = res.data.collaborationToken;

        if (env.SENTRY_DSN) {
          Sentry.configureScope((scope) => {
            scope.setUser({ id: this.currentUserId! });
            scope.setExtra("team", this.team?.name);
            scope.setExtra("teamId", this.currentTeamId);
          });
        }

        // Redirect to the correct custom domain or team subdomain if needed
        // Occurs when the (sub)domain is changed in admin and the user hits an old url
        const { hostname, pathname } = window.location;

        if (data.team.domain) {
          if (data.team.domain !== hostname) {
            window.location.href = `${data.team.url}${pathname}`;
            return;
          }
        } else if (
          isCloudHosted &&
          parseDomain(hostname).teamSubdomain !== (data.team.subdomain ?? "")
        ) {
          window.location.href = `${data.team.url}${pathname}`;
          return;
        }

        // Update the user's timezone if it has changed
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (data.user.timezone !== timezone) {
          const user = this.rootStore.users.get(data.user.id)!;
          void user.save({ timezone });
        }
      });
    } catch (err) {
      if (err.error === "user_suspended") {
        this.isSuspended = true;
        this.suspendedContactEmail = err.data.adminEmail;
        return;
      }
      throw err;
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
      this.currentUserId = null;
      this.currentTeamId = null;
      this.collaborationToken = null;
      this.availableTeams = this.availableTeams?.filter(
        (team) => team.id !== this.team?.id
      );
    });
  };

  @action
  deleteTeam = async (data: { code: string }) => {
    await client.post(`/teams.delete`, data);

    runInAction("AuthStore#deleteTeam", () => {
      this.currentUserId = null;
      this.currentTeamId = null;
      this.availableTeams = this.availableTeams?.filter(
        (team) => team.id !== this.team?.id
      );
    });
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

  /**
   * Logs the user out and optionally revokes the authentication token.
   *
   * @param savePath Whether the current path should be saved and returned to after login.
   * @param tryRevokingToken Whether the auth token should attempt to be revoked, this should be
   * disabled with requests from ApiClient to prevent infinite loops.
   */
  @action
  logout = async (savePath = false, tryRevokingToken = true) => {
    // if this logout was forced from an authenticated route then
    // save the current path so we can go back there once signed in
    if (savePath) {
      setPostLoginPath(window.location.pathname);
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
        domain: getCookieDomain(window.location.hostname, isCloudHosted),
      });
    }

    // clear all credentials from cache (and local storage via autorun)
    this.currentUserId = null;
    this.currentTeamId = null;
    this.collaborationToken = null;
    this.rootStore.clear();

    // Tell the host application we logged out, if any – allows window cleanup.
    if (Desktop.isElectron()) {
      void Desktop.bridge?.onLogout?.();
    }
  };
}
