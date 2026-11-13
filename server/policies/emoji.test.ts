import { buildEmoji, buildTeam, buildUser } from "@server/test/factories";
import { serialize } from "./index";

describe("policies/emoji", () => {
  it("should allow the owner to update and delete", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const emoji = await buildEmoji({ teamId: team.id, createdById: user.id });
    const abilities = serialize(user, emoji);
    expect(abilities.update).toBeTruthy();
    expect(abilities.delete).toBeTruthy();
  });

  it("should not allow an owner from another team to update or delete", async () => {
    const user = await buildUser();
    const team = await buildTeam();
    const emoji = await buildEmoji({ teamId: team.id, createdById: user.id });
    const abilities = serialize(user, emoji);
    expect(abilities.update).toEqual(false);
    expect(abilities.delete).toEqual(false);
  });
});
