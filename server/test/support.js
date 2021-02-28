// @flow
import uuid from "uuid";
import { User, Document, Collection, Team } from "../models";
import { sequelize } from "../sequelize";

export function flushdb() {
  const sql = sequelize.getQueryInterface();
  const tables = Object.keys(sequelize.models).map((model) => {
    const n = sequelize.models[model].getTableName();
    return sql.queryGenerator.quoteTable(
      typeof n === "string" ? n : n.tableName
    );
  });

  const query = `TRUNCATE ${tables.join(", ")} CASCADE`;
  return sequelize.query(query);
}

const seed = async () => {
  const team = await Team.create(
    {
      id: "86fde1d4-0050-428f-9f0b-0bf77f8bdf61",
      name: "Team",
      authenticationProviders: [
        {
          name: "slack",
          serviceId: uuid.v4(),
        },
      ],
    },
    {
      include: "authenticationProviders",
    }
  );

  const authenticationProvider = team.authenticationProviders[0];

  const admin = await User.create(
    {
      id: "fa952cff-fa64-4d42-a6ea-6955c9689046",
      email: "admin@example.com",
      username: "admin",
      name: "Admin User",
      teamId: team.id,
      isAdmin: true,
      createdAt: new Date("2018-01-01T00:00:00.000Z"),
      authentications: [
        {
          authenticationProviderId: authenticationProvider.id,
          serviceId: uuid.v4(),
        },
      ],
    },
    {
      include: "authentications",
    }
  );

  const user = await User.create(
    {
      id: "46fde1d4-0050-428f-9f0b-0bf77f4bdf61",
      email: "user1@example.com",
      username: "user1",
      name: "User 1",
      teamId: team.id,
      createdAt: new Date("2018-01-02T00:00:00.000Z"),
      authentications: [
        {
          authenticationProviderId: authenticationProvider.id,
          serviceId: uuid.v4(),
        },
      ],
    },
    {
      include: "authentications",
    }
  );

  const collection = await Collection.create({
    id: "26fde1d4-0050-428f-9f0b-0bf77f8bdf62",
    name: "Collection",
    urlId: "collection",
    teamId: team.id,
    createdById: user.id,
  });

  const document = await Document.create({
    parentDocumentId: null,
    collectionId: collection.id,
    teamId: team.id,
    userId: collection.createdById,
    lastModifiedById: collection.createdById,
    createdById: collection.createdById,
    title: "First ever document",
    text: "# Much test support",
  });
  await document.publish(collection.createdById);
  await collection.reload();

  return {
    user,
    admin,
    collection,
    document,
    team,
  };
};

export { seed, sequelize };
