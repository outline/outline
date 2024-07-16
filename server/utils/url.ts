import randomstring from "randomstring";

const DocumentUrlIdLen = 10;

export const generateDocUrlId = () => randomstring.generate(DocumentUrlIdLen);
