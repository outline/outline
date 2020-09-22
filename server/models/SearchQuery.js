// @flow
import { DataTypes, sequelize } from "../sequelize";

const SearchQuery = sequelize.define(
  "search_queries",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    source: {
      type: DataTypes.ENUM("slack", "app", "api"),
      allowNull: false,
    },
    query: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    results: {
      type: DataTypes.NUMBER,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    updatedAt: false,
  }
);

SearchQuery.associate = (models) => {
  SearchQuery.belongsTo(models.User, {
    as: "user",
    foreignKey: "userId",
  });
  SearchQuery.belongsTo(models.Team, {
    as: "team",
    foreignKey: "teamId",
  });
};

export default SearchQuery;
