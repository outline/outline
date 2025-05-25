import { createContext, useContext } from "react";
import { PublicTeam } from "@shared/types";
import Team from "~/models/Team";

export const TeamContext = createContext<Team | PublicTeam | undefined>(
  undefined
);

export function useTeamContext() {
  return useContext(TeamContext);
}
