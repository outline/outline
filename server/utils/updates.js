// @flow
import crypto from "crypto";
import invariant from "invariant";
import fetch from "isomorphic-fetch";
import { client } from "../redis";
import packageInfo from "../../package.json";

import { User, Team, Collection, Document } from "../models";

const UPDATES_URL = "https://updates.getoutline.com";
const UPDATES_KEY = "UPDATES_KEY";

export default async () => {
  invariant(
    process.env.SECRET_KEY && process.env.URL,
    "SECRET_KEY or URL env var is not set"
  );
  const secret = process.env.SECRET_KEY.slice(0, 6) + process.env.URL;
  const id = crypto
    .createHash("sha256")
    .update(secret)
    .digest("hex");

  const [
    userCount,
    teamCount,
    collectionCount,
    documentCount,
  ] = await Promise.all([
    User.count(),
    Team.count(),
    Collection.count(),
    Document.count(),
  ]);

  const body = JSON.stringify({
    id,
    version: 1,
    clientVersion: packageInfo.version,
    analytics: {
      userCount,
      teamCount,
      collectionCount,
      documentCount,
    },
  });

  await client.del(UPDATES_KEY);

  try {
    const response = await fetch(UPDATES_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body,
    });

    const data = await response.json();
    if (data.severity) {
      await client.set(
        UPDATES_KEY,
        JSON.stringify({
          severity: data.severity,
          message: data.message,
          url: data.url,
        })
      );
    }
  } catch (_e) {
    // no-op
  }
};
