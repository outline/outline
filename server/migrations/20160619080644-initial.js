'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    queryInterface.createTable('atlases', {
      id:
       { type: 'UUID',
         allowNull: false,
         defaultValue: null,
         special: [],
         primaryKey: true },
      name:
       { type: 'CHARACTER VARYING',
         allowNull: true,
         defaultValue: null,
         special: [],
         primaryKey: false },
      description:
       { type: 'CHARACTER VARYING',
         allowNull: true,
         defaultValue: null,
         special: [],
         primaryKey: false },
      type:
       { type: 'CHARACTER VARYING',
         allowNull: true,
         defaultValue: null,
         special: [],
         primaryKey: false },
      atlasStructure:
       { type: 'JSONB',
         allowNull: true,
         defaultValue: null,
         special: [],
         primaryKey: false },
      createdAt:
       { type: 'TIMESTAMP WITH TIME ZONE',
         allowNull: false,
         defaultValue: null,
         special: [],
         primaryKey: false },
      updatedAt:
       { type: 'TIMESTAMP WITH TIME ZONE',
         allowNull: false,
         defaultValue: null,
         special: [],
         primaryKey: false },
      teamId:
       { type: 'UUID',
         allowNull: true,
         defaultValue: null,
         special: [],
         primaryKey: false } }
    );

    // documents
    queryInterface.createTable('documents', {
      id:
       { type: 'UUID',
         allowNull: false,
         defaultValue: null,
         special: [],
         primaryKey: true },
      urlId:
       { type: 'CHARACTER VARYING',
         allowNull: false,
         unique: true,
         defaultValue: null,
         special: [],
         primaryKey: false },
      private:
       { type: 'BOOLEAN',
         allowNull: false,
         defaultValue: true,
         special: [],
         primaryKey: false },
      title:
       { type: 'CHARACTER VARYING',
         allowNull: false,
         defaultValue: null,
         special: [],
         primaryKey: false },
      text:
       { type: 'TEXT',
         allowNull: true,
         defaultValue: null,
         special: [],
         primaryKey: false },
      html:
       { type: 'TEXT',
         allowNull: true,
         defaultValue: null,
         special: [],
         primaryKey: false },
      preview:
       { type: 'TEXT',
         allowNull: true,
         defaultValue: null,
         special: [],
         primaryKey: false },
      createdAt:
       { type: 'TIMESTAMP WITH TIME ZONE',
         allowNull: false,
         defaultValue: null,
         special: [],
         primaryKey: false },
      updatedAt:
       { type: 'TIMESTAMP WITH TIME ZONE',
         allowNull: false,
         defaultValue: null,
         special: [],
         primaryKey: false },
      userId:
       { type: 'UUID',
         allowNull: true,
         defaultValue: null,
         special: [],
         primaryKey: false },
      atlasId:
       { type: 'UUID',
         allowNull: true,
         defaultValue: null,
         special: [],
         primaryKey: false },
      parentDocumentForId:
       { type: 'UUID',
         allowNull: true,
         defaultValue: null,
         special: [],
         primaryKey: false },
      teamId:
       { type: 'UUID',
         allowNull: true,
         defaultValue: null,
         special: [],
         primaryKey: false }
    });

    queryInterface.createTable('teams', {
      id:
       { type: 'UUID',
         allowNull: false,
         defaultValue: null,
         special: [],
         primaryKey: true },
      name:
       { type: 'CHARACTER VARYING',
         allowNull: true,
         defaultValue: null,
         special: [],
         primaryKey: false },
      slackId:
       { type: 'CHARACTER VARYING',
         allowNull: true,
         defaultValue: null,
         special: [],
         primaryKey: true },
      slackData:
       { type: 'JSONB',
         allowNull: true,
         defaultValue: null,
         special: [],
         primaryKey: false },
      createdAt:
       { type: 'TIMESTAMP WITH TIME ZONE',
         allowNull: false,
         defaultValue: null,
         special: [],
         primaryKey: false },
      updatedAt:
       { type: 'TIMESTAMP WITH TIME ZONE',
         allowNull: false,
         defaultValue: null,
         special: [],
         primaryKey: false } }
    );

    queryInterface.createTable('users', {
      id:
       { type: 'UUID',
         allowNull: false,
         defaultValue: null,
         special: [],
         primaryKey: true },
      email:
       { type: 'CHARACTER VARYING',
         allowNull: false,
         defaultValue: null,
         special: [],
         primaryKey: false },
      username:
       { type: 'CHARACTER VARYING',
         allowNull: false,
         defaultValue: null,
         special: [],
         primaryKey: false },
      name:
       { type: 'CHARACTER VARYING',
         allowNull: false,
         defaultValue: null,
         special: [],
         primaryKey: false },
      isAdmin:
       { type: 'BOOLEAN',
         allowNull: true,
         defaultValue: false,
         special: [],
         primaryKey: false },
      slackAccessToken:
       { type: 'bytea',
         allowNull: true,
         defaultValue: null,
         special: [],
         primaryKey: false },
      slackId:
       { type: 'CHARACTER VARYING',
         allowNull: false,
         defaultValue: null,
         unique: true,
         special: [],
         primaryKey: false },
      slackData:
       { type: 'JSONB',
         allowNull: true,
         defaultValue: null,
         special: [],
         primaryKey: false },
      jwtSecret:
       { type: 'bytea',
         allowNull: true,
         defaultValue: null,
         special: [],
         primaryKey: false },
      createdAt:
       { type: 'TIMESTAMP WITH TIME ZONE',
         allowNull: false,
         defaultValue: null,
         special: [],
         primaryKey: false },
      updatedAt:
       { type: 'TIMESTAMP WITH TIME ZONE',
         allowNull: false,
         defaultValue: null,
         special: [],
         primaryKey: false },
      teamId:
       { type: 'UUID',
         allowNull: true,
         defaultValue: null,
         special: [],
         primaryKey: false }
    });
  },

  down: function (queryInterface, Sequelize) {
    queryInterface.dropAllTables();
  }
};
