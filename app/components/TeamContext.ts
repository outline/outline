import { createContext, useContext } from "react";
import type { PublicTeam } from "@shared/types";
import type Team from "~/models/Team";

export const TeamContext = createContext<Team | PublicTeam | undefined>(
  undefined
);

export function useTeamContext() {
  return useContext(TeamContext);
}
