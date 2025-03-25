import * as T from "./schema";

const router = new Router();
const emailEnabled = !!(env.SMTP_HOST || env.SMTP_SERVICE || env.isDevelopment);
