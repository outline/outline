import "sequelize";

declare module "sequelize" {
  interface Transaction {
    parent?: Transaction;
  }
}
