import path from "node:path";
import { FileOperation, User } from "@server/models";
import {
  buildFileOperation,
  buildUser,
  buildTeam,
  buildAdmin,
} from "@server/test/factories";
import ImportJSONTask from "./ImportJSONTask";

// The fixture has these values for both documents:
// createdById: "ccec260a-e060-4925-ade8-17cfabaf2cac"
// createdByEmail: "hmac.devo@gmail.com"
const fixtureCreatedById = "ccec260a-e060-4925-ade8-17cfabaf2cac";
const fixtureCreatedByEmail = "hmac.devo@gmail.com";

const fixturePath = path.resolve(
  __dirname,
  "..",
  "..",
  "test",
  "fixtures",
  "outline-json.zip"
);

function mockHandle(fileOperation: FileOperation) {
  Object.defineProperty(fileOperation, "handle", {
    get() {
      return {
        path: fixturePath,
        cleanup: async () => {},
      };
    },
  });
  jest.spyOn(FileOperation, "findByPk").mockResolvedValue(fileOperation);
}

describe("ImportJSONTask", () => {
  it("should import the documents, attachments", async () => {
    const fileOperation = await buildFileOperation();
    mockHandle(fileOperation);

    const task = new ImportJSONTask();
    const response = await task.perform({
      fileOperationId: fileOperation.id,
    });

    expect(response.collections.size).toEqual(1);
    expect(response.documents.size).toEqual(2);
    expect(response.attachments.size).toEqual(1);
  });

  describe("user mapping", () => {
    it("should map createdById to an existing user by ID", async () => {
      // Ensure a user exists with the fixture's createdById, handling the
      // case where it may already exist from a prior test run.
      let originalAuthor = await User.findByPk(fixtureCreatedById);
      const teamId = originalAuthor?.teamId ?? (await buildTeam()).id;

      if (!originalAuthor) {
        originalAuthor = await buildUser({
          id: fixtureCreatedById,
          teamId,
        });
      }

      const admin = await buildAdmin({ teamId });
      const fileOperation = await buildFileOperation({
        userId: admin.id,
        teamId,
      });
      mockHandle(fileOperation);

      const task = new ImportJSONTask();
      const response = await task.perform({
        fileOperationId: fileOperation.id,
      });

      for (const document of response.documents.values()) {
        expect(document.createdById).toEqual(originalAuthor.id);
        expect(document.lastModifiedById).toEqual(originalAuthor.id);
      }
    });

    it("should fall back to email matching when ID does not match", async () => {
      const team = await buildTeam();
      // User has matching email but a different ID
      const originalAuthor = await buildUser({
        teamId: team.id,
        email: fixtureCreatedByEmail,
      });
      const admin = await buildAdmin({ teamId: team.id });
      const fileOperation = await buildFileOperation({
        userId: admin.id,
        teamId: team.id,
      });
      mockHandle(fileOperation);

      const task = new ImportJSONTask();
      const response = await task.perform({
        fileOperationId: fileOperation.id,
      });

      for (const document of response.documents.values()) {
        expect(document.createdById).toEqual(originalAuthor.id);
        expect(document.lastModifiedById).toEqual(originalAuthor.id);
      }
    });

    it("should fall back to importing user when no match is found", async () => {
      const team = await buildTeam();
      const admin = await buildAdmin({ teamId: team.id });
      const fileOperation = await buildFileOperation({
        userId: admin.id,
        teamId: team.id,
      });
      mockHandle(fileOperation);

      const task = new ImportJSONTask();
      const response = await task.perform({
        fileOperationId: fileOperation.id,
      });

      for (const document of response.documents.values()) {
        expect(document.createdById).toEqual(admin.id);
        expect(document.lastModifiedById).toEqual(admin.id);
      }
    });

    it("should not match users from a different team", async () => {
      const team = await buildTeam();
      const otherTeam = await buildTeam();
      // Create user with matching email in a different team
      await buildUser({
        teamId: otherTeam.id,
        email: fixtureCreatedByEmail,
      });
      const admin = await buildAdmin({ teamId: team.id });
      const fileOperation = await buildFileOperation({
        userId: admin.id,
        teamId: team.id,
      });
      mockHandle(fileOperation);

      const task = new ImportJSONTask();
      const response = await task.perform({
        fileOperationId: fileOperation.id,
      });

      for (const document of response.documents.values()) {
        expect(document.createdById).toEqual(admin.id);
      }
    });
  });
});
