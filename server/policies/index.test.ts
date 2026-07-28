import { CollectionPermission, UserRole } from "@shared/types";
import { Document } from "@server/models";
import {
  buildUser,
  buildTeam,
  buildCollection,
  buildDocument,
} from "@server/test/factories";
import { can, serialize } from "./index";

describe("serialize", () => {
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
    expect(response.readTemplate).toBeTruthy();
    expect(response.createTemplate).toEqual(false);
    expect(response.inviteUser).toBeTruthy();
  });
});

describe("memoization", () => {
  async function buildNestedFixture() {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id, role: UserRole.Member });
    const collection = await buildCollection({
      teamId: team.id,
      permission: CollectionPermission.ReadWrite,
    });
    const doc = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    const document = await Document.findByPk(doc.id, { userId: user.id });
    return { team, user, document };
  }

  it("should not reuse results between separate can calls", async () => {
    const { user, document } = await buildNestedFixture();

    expect(can(user, "update", document)).toBeTruthy();

    user.role = UserRole.Viewer;
    expect(can(user, "update", document)).toEqual(false);
  });

  it("should not reuse results between separate serialize calls", async () => {
    const { user, document } = await buildNestedFixture();

    expect(serialize(user, document).update).toBeTruthy();

    user.role = UserRole.Viewer;
    expect(serialize(user, document).update).toEqual(false);
  });

  it("should discard the cache when a policy throws", async () => {
    const { user, document } = await buildNestedFixture();
    const team = await buildTeam();

    // Reading a document without preloaded memberships throws from inside the
    // policy, so the evaluation unwinds rather than completing.
    const unscoped = await buildDocument({ teamId: team.id });
    expect(() => can(user, "read", unscoped)).toThrow();

    // Ensures throwing does not leave a  leaked evaluation depth which
    // would leave later checks reading a cache that is never discarded.
    expect(can(user, "update", document)).toBeTruthy();
    user.role = UserRole.Viewer;
    expect(can(user, "update", document)).toEqual(false);
  });
});
