import { TeamPreference } from "@shared/types";
import { Team } from "@server/models";
import presentTeam from "./team";

it("presents a team", () => {
  const team = presentTeam(
    Team.build({
      id: "123",
      name: "Test Team",
    })
  );
  expect(team.id).toEqual("123");
  expect(team.name).toEqual("Test Team");
});

it("omits unrecognized preferences", () => {
  const team = Team.build({ id: "123", name: "Test Team" });
  team.preferences = JSON.parse(
    '{"publicBranding":true,"unknownPreference":true}'
  );

  const data = presentTeam(team);
  expect(data.preferences).toEqual({
    [TeamPreference.PublicBranding]: true,
  });
});

it("presents null preferences", () => {
  const team = Team.build({ id: "123", name: "Test Team" });
  team.preferences = null;

  expect(presentTeam(team).preferences).toBeNull();
});
