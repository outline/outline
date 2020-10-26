// @flow
import { DataTypes, sequelize } from "../sequelize";
const Follow = sequelize.define("follows", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    }
});

Follow.associate = (models) => {
    Follow.belongsTo(models.User, {
        as: "user",
        foreignKey: "userId",
        primary: true,
    });

    Follow.belongsTo(models.RequestedDoc, {
        as: "requested_doc",
        foreignKey: "requestedDocId",
        primary: true,
    });
};


export default Follow;
