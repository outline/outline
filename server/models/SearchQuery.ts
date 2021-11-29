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

      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'val' implicitly has an 'any' type.
      set(val) {
        this.setDataValue("query", val.substring(0, 255));
      },

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

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'models' implicitly has an 'any' type.
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
