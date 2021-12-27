import EncryptedField from "sequelize-encrypted";
import { Sequelize } from "sequelize-typescript";
import Logger from "./logging/logger";

import ApiKey from "./models/ApiKey";
import Attachment from "./models/Attachment";
import AuthenticationProvider from "./models/AuthenticationProvider";
import Backlink from "./models/Backlink";
import Collection from "./models/Collection";
import CollectionGroup from "./models/CollectionGroup";
import CollectionUser from "./models/CollectionUser";
import Document from "./models/Document";
import Event from "./models/Event";
import FileOperation from "./models/FileOperation";
import Group from "./models/Group";
import GroupUser from "./models/GroupUser";
import Integration from "./models/Integration";
import IntegrationAuthentication from "./models/IntegrationAuthentication";
import Notification from "./models/Notification";
import NotificationSetting from "./models/NotificationSetting";
import Pin from "./models/Pin";
import Revision from "./models/Revision";
import SearchQuery from "./models/SearchQuery";
import Share from "./models/Share";
import Star from "./models/Star";
import Team from "./models/Team";
import User from "./models/User";
import UserAuthentication from "./models/UserAuthentication";
import View from "./models/View";

export { Op, DataTypes } from "sequelize";

const isProduction = process.env.NODE_ENV === "production";
const isSSLDisabled = process.env.PGSSLMODE === "disable";

export const encryptedFields = () =>
  EncryptedField(Sequelize, process.env.SECRET_KEY);

export const sequelize = new Sequelize(
  process.env.DATABASE_URL || process.env.DATABASE_CONNECTION_POOL_URL || "",
  {
    logging: (msg) => Logger.debug("database", msg),
    typeValidation: true,
    dialectOptions: {
      ssl:
        isProduction && !isSSLDisabled
          ? {
              // Ref.: https://github.com/brianc/node-postgres/issues/2009
              rejectUnauthorized: false,
            }
          : false,
    },
    models: [
      ApiKey,
      Attachment,
      AuthenticationProvider,
      Backlink,
      Collection,
      CollectionGroup,
      CollectionUser,
      Document,
      Event,
      Group,
      GroupUser,
      Integration,
      IntegrationAuthentication,
      Notification,
      NotificationSetting,
      Pin,
      Revision,
      SearchQuery,
      Share,
      Star,
      Team,
      User,
      UserAuthentication,
      View,
      FileOperation,
    ],
  }
);
