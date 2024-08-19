import { userDetailsUrl as userDataUrl, userTeamsUrl } from "../../shared/url";
import { UserData, TeamData } from "./types";
import { Dictionary } from "./useDictionary";

export class MattermostClient {
  #serverUrl: string;
  #apiKey: string;
  #dictionary: Dictionary;

  constructor({
    serverUrl,
    apiKey,
    dictionary,
  }: {
    serverUrl: string;
    apiKey: string;
    dictionary: Dictionary;
  }) {
    this.#serverUrl = serverUrl;
    this.#apiKey = apiKey;
    this.#dictionary = dictionary;
  }

  getUserData = async (): Promise<UserData> => {
    const url = userDataUrl({ serverUrl: this.#serverUrl });
    return this.#invokeMattermost<UserData>({
      url,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parseResponse: (data: any) => ({
        id: data.id,
        name: data.username,
        email: data.email,
      }),
    });
  };

  getUserTeams = async (): Promise<TeamData[]> => {
    const url = userTeamsUrl({ serverUrl: this.#serverUrl });
    return this.#invokeMattermost<TeamData[]>({
      url,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parseResponse: (data: any) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.map((team: any) => ({ id: team.id, name: team.display_name })),
    });
  };

  #invokeMattermost = async <T>({
    url,
    parseResponse,
  }: {
    url: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parseResponse: (json: any) => T;
  }) => {
    let res: Response;

    try {
      res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.#apiKey}`,
        },
      });
    } catch (err) {
      throw new Error(this.#dictionary.serverError);
    }

    if (res.ok) {
      return parseResponse(await res.json());
    } else if (res.status >= 400 && res.status < 500) {
      throw new Error(this.#dictionary.invalidApiKey);
    } else {
      throw new Error(this.#dictionary.serverError);
    }
  };
}
