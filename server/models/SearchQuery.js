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
      type: DataTypes.ENUM("slack", "app"),
      allowNull: false,
    },
    query: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    results: {
      type: DataTypes.NUMBER,
      allowNull: false,
      defaultValue: 1,
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

SearchQuery.saveQuery = async function (searchQuery) {
  const { userId, teamId, source, query } = searchQuery;

  const hasSearched = await SearchQuery.findOne({
    where: { userId, teamId, source, query },
  });

  if (hasSearched) {
    return await SearchQuery.update(
      { results: hasSearched.results + 1 },
      { where: { userId, teamId, source, query } }
    );
  }

  return await SearchQuery.create({
    userId,
    teamId,
    source,
    query,
  });
};

export default SearchQuery;
