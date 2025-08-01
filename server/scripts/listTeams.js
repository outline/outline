import { Sequelize } from "sequelize-typescript";
import env from "../env.ts";
import Team from "../models/Team.ts";

async function listTeams() {
    const sequelize = new Sequelize({
        dialect: "postgres",
        host: env.DB_HOST,
        port: env.DB_PORT,
        username: env.DB_USERNAME,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
        models: [Team],
        logging: false,
    });

    try {
        await sequelize.authenticate();
        const teams = await Team.findAll({
            attributes: ["id", "name", "domain", "subdomain"],
        });
        console.log("Teams:");
        teams.forEach((team) => {
            console.log(`- ID: ${team.id}, Name: ${team.name}, Domain: ${team.domain}, Subdomain: ${team.subdomain}`);
        });
    } catch (error) {
        console.error("Error listing teams:", error);
    } finally {
        await sequelize.close();
    }
}

listTeams();
