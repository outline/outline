import * as Cookies from "cookies";
import jwt, { Algorithm } from "jsonwebtoken";
import { getUserForJWT } from "@server/utils/jwt";

export default async function createCustomScriptJwt(
  cookies: Cookies,
  secret: string,
  expireationSeconds: number,
  algorithm: string
) {
  const accessToken = cookies.get("accessToken");
  if (!accessToken || !secret) {
    return "";
  }
  try {
    const user = await getUserForJWT(accessToken);
    const toEncode = {
      identifier: user.email,
      exp: Math.floor(Date.now() / 1000) + expireationSeconds,
    };
    return jwt.sign(toEncode, secret, {
      algorithm: algorithm as Algorithm,
    });
  } catch (e) {
    return "";
  }
}
