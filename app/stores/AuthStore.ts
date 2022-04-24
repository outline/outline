import * as Sentry from "@sentry/react";
import invariant from "invariant";
import { observable, action, computed, autorun, runInAction } from "mobx";
import { getCookie, setCookie, removeCookie } from "tiny-cookie";
import { getCookieDomain } from "@shared/utils/domains";
import RootStore from "~/stores/RootStore";
import Policy from "~/models/Policy";
import Team from "~/models/Team";
import User from "~/models/User";
import env from "~/env";
import { client } from "~/utils/ApiClient";
import Storage from "~/utils/Storage";

const AUTH_STORE = "AUTH_STORE";
const NO_REDIRECT_PATHS = ["/", "/create", "/home"];

type PersistedData = {
  user?: User;
  team?: Team;
  policies?: Policy[];
};

type Provider = {
  id: string;
  name: string;
  authUrl: string;
};

export type Config = {
  name?: string;
  hostname?: string;
  providers: Provider[];
};

export default class AuthStore {
  @observable
  user: User | null | undefined;

  @observable
  team: Team | null | undefined;

  @observable
  token: string | null | undefined;

  @observable
  policies: Policy[] = [];

  @observable
  lastSignedIn: string | null | undefined;

  @observable
  isSaving = false;

  @observable
  isSuspended = false;

  @observable
  suspendedContactEmail: string | null | undefined;

  @observable
  config: Config | null | undefined;

  rootStore: RootStore;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
    // attempt to load the previous state of this store from localstorage
    const data: PersistedData = Storage.get(AUTH_STORE) || {};

    this.rehydrate(data);

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
            this.logout();
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
    this.token = getCookie("accessToken");
    this.lastSignedIn = getCookie("lastSignedIn");
    this.addPolicies(data.policies);

    if (this.token) {
      setImmediate(() => this.fetch());
    }
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
    return !!this.token;
  }

  @computed
  get asJson() {
    return {
      user: this.user,
      team: this.team,
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
    try {
      const res = await client.post("/auth.info");
      invariant(res?.data, "Auth not available");
      runInAction("AuthStore#fetch", () => {
        this.addPolicies(res.policies);
        const { user, team } = res.data;
        this.user = new User(user, this);
        this.team = new Team(team, this);

        if (env.SENTRY_DSN) {
          Sentry.configureScope(function (scope) {
            scope.setUser({
              id: user.id,
            });
            scope.setExtra("team", team.name);
            scope.setExtra("teamId", team.id);
          });
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
      }
    }
  };

  @action
  deleteUser = async () => {
    await client.post(`/users.delete`, {
      confirmation: true,
    });
    runInAction("AuthStore#updateUser", () => {
      this.user = null;
      this.team = null;
      this.token = null;
    });
  };

  @action
  updateUser = async (params: {
    name?: string;
    avatarUrl?: string | null;
    language?: string;
  }) => {
    this.isSaving = true;

    try {
      const res = await client.post(`/users.update`, params);
      invariant(res?.data, "User response not available");
      runInAction("AuthStore#updateUser", () => {
        this.addPolicies(res.policies);
        this.user = new User(res.data, this);
      });
    } finally {
      this.isSaving = false;
    }
  };

  @action
  updateTeam = async (params: {
    name?: string;
    avatarUrl?: string | null | undefined;
    sharing?: boolean;
    collaborativeEditing?: boolean;
    defaultCollectionId?: string | null;
    subdomain?: string | null | undefined;
  }) => {
    this.isSaving = true;

    try {
      const res = await client.post(`/team.update`, params);
      invariant(res?.data, "Team response not available");
      runInAction("AuthStore#updateTeam", () => {
        this.addPolicies(res.policies);
        this.team = new Team(res.data, this);
      });
    } finally {
      this.isSaving = false;
    }
  };

  @action
  logout = async (savePath = false) => {
    // remove user and team from localStorage
    Storage.set(AUTH_STORE, {
      user: null,
      team: null,
      policies: [],
    });
    this.token = null;

    // if this logout was forced from an authenticated route then
    // save the current path so we can go back there once signed in
    if (savePath) {
      const pathName = window.location.pathname;

      if (!NO_REDIRECT_PATHS.includes(pathName)) {
        setCookie("postLoginRedirectPath", pathName);
      }
    }

    // remove authentication token itself
    removeCookie("accessToken", {
      path: "/",
    });
    // remove session record on apex cookie
    const team = this.team;

    if (team) {
      const sessions = JSON.parse(getCookie("sessions") || "{}");
      delete sessions[team.id];
      setCookie("sessions", JSON.stringify(sessions), {
        domain: getCookieDomain(window.location.hostname),
      });
      this.team = null;
    }
  };
}
