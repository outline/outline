// @flow
import fs from "fs";
import path from "path";
import { URL } from "url";
import util from "util";
import { v4 as uuidv4 } from "uuid";
import {
  stripSubdomain,
  RESERVED_SUBDOMAINS,
} from "../../shared/utils/domains";
import { DataTypes, sequelize, Op } from "../sequelize";
import { generateAvatarUrl } from "../utils/avatars";
import { publicS3Endpoint, uploadToS3FromUrl } from "../utils/s3";

import Collection from "./Collection";
import Document from "./Document";

const readFile = util.promisify(fs.readFile);

const Team = sequelize.define(
  "team",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: DataTypes.STRING,
    subdomain: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isLowercase: true,
        is: {
          args: [/^[a-z\d-]+$/, "i"],
          msg: "Must be only alphanumeric and dashes",
        },
        len: {
          args: [4, 32],
          msg: "Must be between 4 and 32 characters",
        },
        notIn: {
          args: [RESERVED_SUBDOMAINS],
          msg: "You chose a restricted word, please try another.",
        },
      },
      unique: true,
    },
    domain: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    slackId: { type: DataTypes.STRING, allowNull: true },
    googleId: { type: DataTypes.STRING, allowNull: true },
    avatarUrl: { type: DataTypes.STRING, allowNull: true },
    sharing: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    signupQueryParams: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    guestSignin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    documentEmbeds: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    paranoid: true,
    getterMethods: {
      url() {
        if (this.domain) {
          return `https://${this.domain}`;
        }
        if (!this.subdomain || process.env.SUBDOMAINS_ENABLED !== "true") {
          return process.env.URL;
        }

        const url = new URL(process.env.URL);
        url.host = `${this.subdomain}.${stripSubdomain(url.host)}`;
        return url.href.replace(/\/$/, "");
      },
      logoUrl() {
        return (
          this.avatarUrl ||
          generateAvatarUrl({
            id: this.id,
            name: this.name,
          })
        );
      },
    },
  }
);

Team.associate = (models) => {
  Team.hasMany(models.Collection, { as: "collections" });
  Team.hasMany(models.Document, { as: "documents" });
  Team.hasMany(models.User, { as: "users" });
  Team.hasMany(models.AuthenticationProvider, {
    as: "authenticationProviders",
  });
  Team.addScope("withAuthenticationProviders", {
    include: [
      { model: models.AuthenticationProvider, as: "authenticationProviders" },
    ],
  });
};

const uploadAvatar = async (model) => {
  const endpoint = publicS3Endpoint();
  const { avatarUrl } = model;

  if (
    avatarUrl &&
    !avatarUrl.startsWith("/api") &&
    !avatarUrl.startsWith(endpoint)
  ) {
    try {
      const newUrl = await uploadToS3FromUrl(
        avatarUrl,
        `avatars/${model.id}/${uuidv4()}`,
        "public-read"
      );
      if (newUrl) model.avatarUrl = newUrl;
    } catch (err) {
      // we can try again next time
      console.error(err);
    }
  }
};

Team.prototype.provisionSubdomain = async function (
  requestedSubdomain: string,
  options = {}
) {
  if (this.subdomain) return this.subdomain;

  let subdomain = requestedSubdomain;
  let append = 0;
  while (true) {
    try {
      await this.update({ subdomain }, options);
      break;
    } catch (err) {
      // subdomain was invalid or already used, try again
      subdomain = `${requestedSubdomain}${++append}`;
    }
  }

  return subdomain;
};

Team.prototype.provisionFirstCollection = async function (userId) {
  const collection = await Collection.create({
    name: "Welcome",
    description:
      "This collection is a quick guide to what Outline is all about. Feel free to delete this collection once your team is up to speed with the basics!",
    teamId: this.id,
    createdById: userId,
    sort: Collection.DEFAULT_SORT,
    permission: "read_write",
  });

  // For the first collection we go ahead and create some intitial documents to get
  // the team started. You can edit these in /server/onboarding/x.md
  const onboardingDocs = [
    "Support",
    "Integrations & API",
    "Our Editor",
    "What is Outline",
  ];

  for (const title of onboardingDocs) {
    const text = await readFile(
      path.join(process.cwd(), "server", "onboarding", `${title}.md`),
      "utf8"
    );
    const document = await Document.create({
      version: 1,
      isWelcome: true,
      parentDocumentId: null,
      collectionId: collection.id,
      teamId: collection.teamId,
      userId: collection.createdById,
      lastModifiedById: collection.createdById,
      createdById: collection.createdById,
      title,
      text,
    });
    await document.publish(collection.createdById);
  }
};

Team.prototype.collectionIds = async function (paranoid: boolean = true) {
  let models = await Collection.findAll({
    attributes: ["id"],
    where: {
      teamId: this.id,
      permission: {
        [Op.ne]: null,
      },
    },
    paranoid,
  });

  return models.map((c) => c.id);
};

Team.beforeSave(uploadAvatar);

export default Team;
