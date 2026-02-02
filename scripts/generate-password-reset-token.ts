import "reflect-metadata";
import { sequelize } from "@server/storage/database";
import { User } from "@server/models";

const email = process.argv[2];

if (!email) {
    console.error("Usage: yarn ts-node scripts/generate-password-reset-token.ts <email>");
    process.exit(1);
}

(async () => {
    try {
        await sequelize.authenticate();

        const user = await User.findOne({
            where: { email: email.toLowerCase() },
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
        console.error("Error:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
})();
