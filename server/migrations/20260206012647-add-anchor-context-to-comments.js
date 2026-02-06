"use strict";

const ANCHOR_SYM = Symbol("anchor");
const CONTEXT_SYM = Symbol("context");

const fieldMapping = {
  [ANCHOR_SYM]: "anchor",
  [CONTEXT_SYM]: "context",
};

const performDbUpdate = (qi, types, reverting) => {
  const symOrder = reverting ? [CONTEXT_SYM, ANCHOR_SYM] : [ANCHOR_SYM, CONTEXT_SYM];
  
  return qi.sequelize.transaction(async (txn) => {
    await symOrder.reduce((promise, sym) => {
      return promise.then(() => {
        const colName = fieldMapping[sym];
        return reverting
          ? qi.removeColumn("comments", colName, { transaction: txn })
          : qi.addColumn("comments", colName, { type: types.JSONB, allowNull: true }, { transaction: txn });
      });
    }, Promise.resolve());
  });
};

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  up: (qi, types) => performDbUpdate(qi, types, false),
  down: (qi, types) => performDbUpdate(qi, types, true),
};
