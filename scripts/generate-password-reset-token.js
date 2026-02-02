#!/usr/bin/env node
const path = require("path");

process.env.TS_NODE_PROJECT =
    process.env.TS_NODE_PROJECT || path.resolve(__dirname, "../tsconfig.json");
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
    module: "CommonJS",
    emitDecoratorMetadata: true,
    experimentalDecorators: true
});
process.env.TS_NODE_TRANSPILE_ONLY = "true";

require("reflect-metadata");
require("ts-node/register");
require("tsconfig-paths/register");

const { sequelize, User } = require("../server/models");

const email = process.argv[2];

if (!email) {
    console.error("Usage: node scripts/generate-password-reset-token.js <email>");
    process.exit(1);
}

(async () => {
    try {
        await sequelize.authenticate();

        const user = await User.findOne({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            console.error(`No user found for ${email}`);
            process.exit(1);
        }

        const token = user.getPasswordResetToken();
        const resetUrl = `https://local.outline.dev:3000/auth/password.reset.confirm?token=${token}&client=web`;

        console.log("\n=== Password Reset Token ===");
        console.log(`User: ${user.email}`);
        console.log(`Token: ${token}`);
        console.log(`\nReset URL:\n${resetUrl}\n`);

        process.exit(0);
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
})();
