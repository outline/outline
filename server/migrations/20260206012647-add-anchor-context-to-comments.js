"use strict";

const COLS_TO_ADD = ["anchor", "context"];

const performDbUpdate = (queryInterface, types, reverting) => {
  const colOrder = reverting ? [...COLS_TO_ADD].reverse() : COLS_TO_ADD;
  
  return queryInterface.sequelize.transaction(async (txn) => {
    await colOrder.reduce((promise, colName) => {
      return promise.then(() => {
        return reverting
          ? queryInterface.removeColumn("comments", colName, { transaction: txn })
          : queryInterface.addColumn("comments", colName, { type: types.JSONB, allowNull: true }, { transaction: txn });
      });
    }, Promise.resolve());
  });
};

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  up: (queryInterface, types) => performDbUpdate(queryInterface, types, false),
  down: (queryInterface, types) => performDbUpdate(queryInterface, types, true),
};
