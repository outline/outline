"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "databases",
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
          },
          name: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          icon: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          color: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          dataSchema: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: [],
          },
          views: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: [],
          },
          collectionId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "collections", key: "id" },
            onDelete: "cascade",
          },
          teamId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "teams", key: "id" },
            onDelete: "cascade",
          },
          createdById: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "users", key: "id" },
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          deletedAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex("databases", ["collectionId"], {
        transaction,
      });
      await queryInterface.addIndex("databases", ["teamId"], { transaction });

      await queryInterface.addColumn(
        "documents",
        "databaseId",
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: "databases", key: "id" },
          onDelete: "set null",
        },
        { transaction }
      );
      await queryInterface.addIndex("documents", ["databaseId"], {
        transaction,
      });

      // every collection that was itself a database becomes a single database
      // owned by that collection, and its documents become that database's rows
      await queryInterface.sequelize.query(
        `
        INSERT INTO databases (
          id, name, icon, color, "dataSchema", views,
          "collectionId", "teamId", "createdById", "createdAt", "updatedAt"
        )
        SELECT
          uuid_generate_v4(),
          c.name,
          c.icon,
          c.color,
          c."dataSchema",
          COALESCE(c.views, '[]'::jsonb),
          c.id,
          c."teamId",
          COALESCE(
            c."createdById",
            (SELECT u.id FROM users u WHERE u."teamId" = c."teamId" ORDER BY u."createdAt" ASC LIMIT 1)
          ),
          NOW(),
          NOW()
        FROM collections c
        WHERE c."dataSchema" IS NOT NULL
          AND COALESCE(
            c."createdById",
            (SELECT u.id FROM users u WHERE u."teamId" = c."teamId" ORDER BY u."createdAt" ASC LIMIT 1)
          ) IS NOT NULL
`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
        UPDATE documents d
        SET "databaseId" = db.id
        FROM databases db
        WHERE d."collectionId" = db."collectionId"
          AND d."deletedAt" IS NULL
        `,
        { transaction }
      );

      // relation properties referenced a target collection; they now reference
      // that collection's migrated database
      await queryInterface.sequelize.query(
        `
        UPDATE databases db
        SET "dataSchema" = (
          SELECT jsonb_agg(
            CASE
              WHEN property->'config' ? 'targetCollectionId' THEN
                jsonb_set(
                  property #- '{config,targetCollectionId}',
                  '{config,targetDatabaseId}',
                  COALESCE(
                    (
                      SELECT to_jsonb(target.id)
                      FROM databases target
                      WHERE target."collectionId" =
                        (property->'config'->>'targetCollectionId')::uuid
                      LIMIT 1
                    ),
                    to_jsonb(db.id)
                  )
                )
              ELSE property
            END
            ORDER BY ordinality
          )
          FROM jsonb_array_elements(db."dataSchema") WITH ORDINALITY AS t(property, ordinality)
        )
        WHERE db."dataSchema" @> '[{"type": "relation"}]'
        `,
        { transaction }
      );

      await queryInterface.removeColumn("collections", "dataSchema", {
        transaction,
      });
      await queryInterface.removeColumn("collections", "views", {
        transaction,
      });
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "collections",
        "dataSchema",
        { type: Sequelize.JSONB, allowNull: true, defaultValue: null },
        { transaction }
      );
      await queryInterface.addColumn(
        "collections",
        "views",
        { type: Sequelize.JSONB, allowNull: true, defaultValue: null },
        { transaction }
      );

      // restore the first database of each collection onto the collection
      await queryInterface.sequelize.query(
        `
        UPDATE collections c
        SET "dataSchema" = db."dataSchema", views = db.views
        FROM (
          SELECT DISTINCT ON ("collectionId") "collectionId", "dataSchema", views
          FROM databases
          WHERE "deletedAt" IS NULL
          ORDER BY "collectionId", "createdAt" ASC
        ) db
        WHERE c.id = db."collectionId"
        `,
        { transaction }
      );

      await queryInterface.removeIndex("documents", ["databaseId"], {
        transaction,
      });
      await queryInterface.removeColumn("documents", "databaseId", {
        transaction,
      });
      await queryInterface.dropTable("databases", { transaction });
    });
  },
};
