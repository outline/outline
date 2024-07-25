import randomstring from "randomstring";

const UrlIdLength = 10;

export const generateUrlId = () => randomstring.generate(UrlIdLength);
