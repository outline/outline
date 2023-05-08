import * as React from "react";
import { PublicTeam } from "@shared/types";
import Team from "~/models/Team";

export const TeamContext = React.createContext<Team | PublicTeam | undefined>(
  undefined
);

export function useTeamContext() {
  return React.useContext(TeamContext);
}
