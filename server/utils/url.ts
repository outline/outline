import { randomString } from "@shared/random";

const UrlIdLength = 10;

export const generateUrlId = () => randomString(UrlIdLength);
