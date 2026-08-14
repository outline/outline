import { TeamPreference } from "@shared/types";
import { buildTeam } from "@server/test/factories";
import RevokeDynamicOAuthClientsTask from "../tasks/RevokeDynamicOAuthClientsTask";
import TeamUpdatedProcessor from "./TeamUpdatedProcessor";

const ip = "127.0.0.1";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TeamUpdatedProcessor", () => {
  it("should schedule revocation when the MCP preference is disabled", async () => {
    const team = await buildTeam();
    const spy = vi.spyOn(RevokeDynamicOAuthClientsTask.prototype, "schedule");

    const processor = new TeamUpdatedProcessor();
    await processor.perform({
      name: "teams.update",
      teamId: team.id,
      actorId: team.id,
      ip,
      changes: {
        attributes: { preferences: { [TeamPreference.MCP]: false } },
        previous: { preferences: { [TeamPreference.MCP]: true } },
      },
    });

    expect(spy).toHaveBeenCalledWith({ teamId: team.id });
  });

  it("should not schedule revocation when the MCP preference is enabled", async () => {
    const team = await buildTeam();
    const spy = vi.spyOn(RevokeDynamicOAuthClientsTask.prototype, "schedule");

    const processor = new TeamUpdatedProcessor();
    await processor.perform({
      name: "teams.update",
      teamId: team.id,
      actorId: team.id,
      ip,
      changes: {
        attributes: { preferences: { [TeamPreference.MCP]: true } },
        previous: { preferences: { [TeamPreference.MCP]: false } },
      },
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("should not schedule revocation for an unrelated preference change", async () => {
    const team = await buildTeam();
    const spy = vi.spyOn(RevokeDynamicOAuthClientsTask.prototype, "schedule");

    const processor = new TeamUpdatedProcessor();
    await processor.perform({
      name: "teams.update",
      teamId: team.id,
      actorId: team.id,
      ip,
      changes: {
        attributes: {
          preferences: { [TeamPreference.ViewersCanExport]: false },
        },
        previous: { preferences: { [TeamPreference.ViewersCanExport]: true } },
      },
    });

    expect(spy).not.toHaveBeenCalled();
  });
});
