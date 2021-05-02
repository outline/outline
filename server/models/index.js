// @flow
import ApiKey from "./ApiKey";
import Attachment from "./Attachment";
import AuthenticationProvider from "./AuthenticationProvider";
import Backlink from "./Backlink";
import Collection from "./Collection";
import CollectionGroup from "./CollectionGroup";
import CollectionUser from "./CollectionUser";
import Document from "./Document";
import Event from "./Event";
import Group from "./Group";
import GroupUser from "./GroupUser";
import Integration from "./Integration";
import IntegrationAuthentication from "./IntegrationAuthentication";
import Notification from "./Notification";
import NotificationSetting from "./NotificationSetting";
import Revision from "./Revision";
import SearchQuery from "./SearchQuery";
import Share from "./Share";
import Star from "./Star";
import Team from "./Team";
import User from "./User";
import UserAuthentication from "./UserAuthentication";
import View from "./View";

const models = {
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
  Revision,
  SearchQuery,
  Share,
  Star,
  Team,
  User,
  UserAuthentication,
  View,
};

// based on https://github.com/sequelize/express-example/blob/master/models/index.js
Object.keys(models).forEach((modelName) => {
  if ("associate" in models[modelName]) {
    models[modelName].associate(models);
  }
});

export {
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
  Revision,
  SearchQuery,
  Share,
  Star,
  Team,
  User,
  UserAuthentication,
  View,
};
