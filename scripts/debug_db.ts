
const { Sequelize } = require('sequelize-typescript');
const env = process.env;

const databaseConfig = env.DATABASE_URL || "postgres://user:pass@127.0.0.1:5432/outline";

console.log(`Attempting to connect to: ${databaseConfig}`);

try {
    const sequelize = new Sequelize(databaseConfig, {
        dialect: 'postgres',
        logging: false,
    });

    console.log("Sequelize initialized successfully (not yet connected).");

    sequelize.authenticate()
        .then(() => {
            console.log('Connection has been established successfully.');
            return sequelize.query('SELECT 1+1 AS result');
        })
        .then(() => {
            process.exit(0);
        })
        .catch((err) => {
            console.error('Unable to connect to the database:', err);
            process.exit(1);
        });

} catch (error) {
    console.error('Failed to initialize Sequelize:', error);
    process.exit(1);
}
