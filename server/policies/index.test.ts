import { buildUser, buildTeam } from "@server/test/factories";
import { serialize } from "./index";

it("should serialize policy", async () => {
  const user = await buildUser();
  const response = serialize(user, user);
  expect(response.update).toBeTruthy();
  expect(response.delete).toBeTruthy();
});

it("should serialize domain policies on Team", async () => {
  const team = await buildTeam();
  const user = await buildUser({
    teamId: team.id,
  });
  const response = serialize(user, team);
  expect(response.createTemplate).toBeTruthy();
  expect(response.inviteUser).toBeTruthy();
});
