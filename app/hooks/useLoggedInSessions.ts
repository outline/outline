import { getCookie } from "tiny-cookie";

export type Sessions = Record<
  string,
  {
    name: string;
    logoUrl: string;
    url: string;
  }
>;

export function useLoggedInSessions(): Sessions {
  return JSON.parse(getCookie("sessions") || "{}");
}
