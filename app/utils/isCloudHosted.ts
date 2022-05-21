import env from "~/env";

/**
 * True if the current installation is the cloud hosted version at getoutline.com
 */
const isCloudHosted = env.DEPLOYMENT === "hosted";

export default isCloudHosted;
