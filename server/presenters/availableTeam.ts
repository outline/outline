import { Team } from "@server/models";

export default function present(team: Team) {
  return {
    id: team.id,
    name: team.name,
    avatarUrl: team.logoUrl,
    url: team.url,
  };
}
