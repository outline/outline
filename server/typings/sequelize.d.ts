import "sequelize";

declare module "sequelize" {
  interface Transaction {
    parent?: Transaction;
  }

  interface QueryOptions {
    /**
     * When true the query is executed on the read-replica connection, if one
     * is configured. Has no effect when a `transaction` is also provided, as
     * the query then always runs on the transaction's own connection.
     */
    readOnly?: boolean;
  }
}
