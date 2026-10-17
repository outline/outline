import "sequelize";

declare module "sequelize" {
  interface Transaction {
    parent?: Transaction;
  }

  interface CountOptions<TAttributes> {
    /** Values for named or positional placeholders in literal where clauses. */
    replacements?: BindOrReplacements;
  }
}
