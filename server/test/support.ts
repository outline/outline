import TestServer from "fetch-test-server";
import { v4 as uuidv4 } from "uuid";
import { CollectionPermission } from "@shared/types";
import { sequelize as db } from "@server/database/sequelize";
import { User, Document, Collection, Team } from "@server/models";
import webService from "@server/services/web";

export const seed = async () => {
  return db.transaction(async (transaction) => {
    const team = await Team.create(
      {
        name: "Team",
        collaborativeEditing: false,
        authenticationProviders: [
          {
            name: "slack",
            providerId: uuidv4(),
          },
        ],
      },
      {
        transaction,
        include: "authenticationProviders",
      }
    );
    const authenticationProvider = team.authenticationProviders[0];
    const admin = await User.create(
      {
        email: "admin@example.com",
        username: "admin",
        name: "Admin User",
        teamId: team.id,
        isAdmin: true,
        createdAt: new Date("2018-01-01T00:00:00.000Z"),
        authentications: [
          {
            authenticationProviderId: authenticationProvider.id,
            providerId: uuidv4(),
          },
        ],
      },
      {
        transaction,
        include: "authentications",
      }
    );
    const user = await User.create(
      {
        id: "46fde1d4-0050-428f-9f0b-0bf77f4bdf61",
        email: "user1@example.com",
        name: "User 1",
        teamId: team.id,
        createdAt: new Date("2018-01-02T00:00:00.000Z"),
        authentications: [
          {
            authenticationProviderId: authenticationProvider.id,
            providerId: uuidv4(),
          },
        ],
      },
      {
        transaction,
        include: "authentications",
      }
    );
    const collection = await Collection.create(
      {
        name: "Collection",
        urlId: "collection",
        teamId: team.id,
        createdById: user.id,
        permission: CollectionPermission.ReadWrite,
      },
      {
        transaction,
      }
    );
    const document = await Document.create(
      {
        parentDocumentId: null,
        collectionId: collection.id,
        teamId: team.id,
        userId: collection.createdById,
        lastModifiedById: collection.createdById,
        createdById: collection.createdById,
        title: "First ever document",
        text: "# Much test support",
      },
      { transaction }
    );
    await document.publish(collection.createdById, { transaction });
    await collection.reload({ transaction });
    return {
      user,
      admin,
      collection,
      document,
      team,
    };
  });
};

export function getTestServer() {
  const app = webService();
  const server = new TestServer(app.callback());

  server.disconnect = async () => {
    await db.close();
    server.close();
  };

  return server;
}

export function getTestDatabase() {
  const flush = async () => {
    const sql = db.getQueryInterface();
    const tables = Object.keys(db.models).map((model) => {
      const n = db.models[model].getTableName();
      return (sql.queryGenerator as any).quoteTable(
        typeof n === "string" ? n : n.tableName
      );
    });
    const flushQuery = `TRUNCATE ${tables.join(", ")} CASCADE`;

    await db.query(flushQuery);
  };

  const disconnect = async () => {
    await db.close();
  };

  return { flush, disconnect };
}
