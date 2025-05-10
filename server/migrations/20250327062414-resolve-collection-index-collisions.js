"use strict";

const { execFileSync } = require("child_process");
const path = require("path");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up() {
    if (
      process.env.NODE_ENV === "test" ||
      process.env.DEPLOYMENT === "hosted"
    ) {
      return;
    }

    const scriptName = path.basename(__filename);
    const scriptPath = path.join(
      process.cwd(),
      "build",
      `server/scripts/${scriptName}`
    );

    execFileSync("node", [scriptPath], { stdio: "inherit" });
  },

  async down() {
    // noop
  },
};
