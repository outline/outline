import { createContext } from "@server/context";
import {
  AuthenticationProvider,
  ExternalGroup,
  Group,
  GroupUser,
} from "@server/models";
import { sequelize } from "@server/storage/database";
import { buildUser } from "@server/test/factories";
import groupsSyncer from "./groupsSyncer";

describe("groupsSyncer", () => {
  const ip = "127.0.0.1";

  it("should create groups and memberships for new external groups", async () => {
    const user = await buildUser();
    const team = await user.$get("team")!;
    const authenticationProvider = (await AuthenticationProvider.findOne({
      where: { teamId: user.teamId },
    }))!;

    const result = await sequelize.transaction(async (transaction) =>
      groupsSyncer(createContext({ user, transaction, ip }), {
        user,
        team: team!,
        authenticationProvider,
        externalGroups: [
          { id: "ext-1", name: "Engineering" },
          { id: "ext-2", name: "Design" },
        ],
      })
    );

    expect(result.groupsCreated).toEqual(2);
    expect(result.membershipsAdded).toEqual(2);
    expect(result.membershipsRemoved).toEqual(0);

    const groups = await Group.findAll({ where: { teamId: user.teamId } });
    expect(groups.map((g) => g.name).sort()).toEqual(["Design", "Engineering"]);
  });

  it("should update internal group name when external name changes", async () => {
    const user = await buildUser();
    const team = await user.$get("team")!;
    const authenticationProvider = (await AuthenticationProvider.findOne({
      where: { teamId: user.teamId },
    }))!;

    // Initial sync creates the group
    await sequelize.transaction(async (transaction) =>
      groupsSyncer(createContext({ user, transaction, ip }), {
        user,
        team: team!,
        authenticationProvider,
        externalGroups: [{ id: "ext-1", name: "Engineering" }],
      })
    );

    const groupBefore = await Group.findOne({
      where: { teamId: user.teamId, name: "Engineering" },
    });
    expect(groupBefore).not.toBeNull();

    // Second sync with updated name
    await sequelize.transaction(async (transaction) =>
      groupsSyncer(createContext({ user, transaction, ip }), {
        user,
        team: team!,
        authenticationProvider,
        externalGroups: [{ id: "ext-1", name: "Platform Engineering" }],
      })
    );

    const groupAfter = await Group.findByPk(groupBefore!.id);
    expect(groupAfter!.name).toEqual("Platform Engineering");

    const externalGroup = await ExternalGroup.findOne({
      where: {
        authenticationProviderId: authenticationProvider.id,
        externalId: "ext-1",
      },
    });
    expect(externalGroup!.name).toEqual("Platform Engineering");
  });

  it("should remove memberships when user is no longer in external group", async () => {
    const user = await buildUser();
    const team = await user.$get("team")!;
    const authenticationProvider = (await AuthenticationProvider.findOne({
      where: { teamId: user.teamId },
    }))!;

    // Initial sync with two groups
    await sequelize.transaction(async (transaction) =>
      groupsSyncer(createContext({ user, transaction, ip }), {
        user,
        team: team!,
        authenticationProvider,
        externalGroups: [
          { id: "ext-1", name: "Engineering" },
          { id: "ext-2", name: "Design" },
        ],
      })
    );

    // Second sync with only one group
    const result = await sequelize.transaction(async (transaction) =>
      groupsSyncer(createContext({ user, transaction, ip }), {
        user,
        team: team!,
        authenticationProvider,
        externalGroups: [{ id: "ext-1", name: "Engineering" }],
      })
    );

    expect(result.membershipsRemoved).toEqual(1);

    const designGroup = await Group.findOne({
      where: { teamId: user.teamId, name: "Design" },
    });
    const membership = await GroupUser.findOne({
      where: { groupId: designGroup!.id, userId: user.id },
    });
    expect(membership).toBeNull();
  });

  it("should not create duplicate memberships on re-sync", async () => {
    const user = await buildUser();
    const team = await user.$get("team")!;
    const authenticationProvider = (await AuthenticationProvider.findOne({
      where: { teamId: user.teamId },
    }))!;

    const groups = [{ id: "ext-1", name: "Engineering" }];

    await sequelize.transaction(async (transaction) =>
      groupsSyncer(createContext({ user, transaction, ip }), {
        user,
        team: team!,
        authenticationProvider,
        externalGroups: groups,
      })
    );

    const result = await sequelize.transaction(async (transaction) =>
      groupsSyncer(createContext({ user, transaction, ip }), {
        user,
        team: team!,
        authenticationProvider,
        externalGroups: groups,
      })
    );

    expect(result.groupsCreated).toEqual(0);
    expect(result.membershipsAdded).toEqual(0);

    const memberships = await GroupUser.findAll({
      where: { userId: user.id },
    });
    expect(memberships).toHaveLength(1);
  });

  it("should remove all memberships when user has no external groups", async () => {
    const user = await buildUser();
    const team = await user.$get("team")!;
    const authenticationProvider = (await AuthenticationProvider.findOne({
      where: { teamId: user.teamId },
    }))!;

    await sequelize.transaction(async (transaction) =>
      groupsSyncer(createContext({ user, transaction, ip }), {
        user,
        team: team!,
        authenticationProvider,
        externalGroups: [{ id: "ext-1", name: "Engineering" }],
      })
    );

    const result = await sequelize.transaction(async (transaction) =>
      groupsSyncer(createContext({ user, transaction, ip }), {
        user,
        team: team!,
        authenticationProvider,
        externalGroups: [],
      })
    );

    expect(result.membershipsRemoved).toEqual(1);
  });
});
