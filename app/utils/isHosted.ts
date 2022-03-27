import env from "~/env";

const isHosted = env.DEPLOYMENT === "hosted";

export default isHosted;
