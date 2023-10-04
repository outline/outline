import { CollectionPermission, UserRole } from "@shared/types";
import { UserPermission } from "@server/models";
import { buildUser, buildAdmin, buildCollection } from "@server/test/factories";
import userDemoter from "./userDemoter";

describe("userDemoter", () => {
  const ip = "127.0.0.1";

  it("should change role and associated collection permissions", async () => {
    const admin = await buildAdmin();
    const user = await buildUser({ teamId: admin.teamId });
    const collection = await buildCollection({ teamId: admin.teamId });

    const membership = await UserPermission.create({
      createdById: admin.id,
      userId: user.id,
      collectionId: collection.id,
      permission: CollectionPermission.ReadWrite,
    });

    await userDemoter({
      user,
      actorId: admin.id,
      to: UserRole.Viewer,
      ip,
    });

    expect(user.isViewer).toEqual(true);

    await membership.reload();
    expect(membership.permission).toEqual(CollectionPermission.Read);
  });
});
