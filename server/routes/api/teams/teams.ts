import { presentTeam, presentPolicies } from "@server/presenters";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { safeEqual } from "@server/utils/crypto";
import * as T from "./schema";

const router = new Router();
const emailEnabled = !!(env.SMTP_HOST || env.SMTP_SERVICE || env.isDevelopment);
