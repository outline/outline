export default function setup() {
  return async () => {
    const { sequelize } = await import("@server/storage/database");
    await sequelize.close();
  };
}
