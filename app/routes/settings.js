// @flow
import * as React from "react";
import { Switch } from "react-router-dom";
import Details from "scenes/Settings/Details";
import Groups from "scenes/Settings/Groups";
import ImportExport from "scenes/Settings/ImportExport";
import Notifications from "scenes/Settings/Notifications";
import People from "scenes/Settings/People";
import Profile from "scenes/Settings/Profile";
import Security from "scenes/Settings/Security";
import Shares from "scenes/Settings/Shares";
import Slack from "scenes/Settings/Slack";
import Tokens from "scenes/Settings/Tokens";
import Zapier from "scenes/Settings/Zapier";
import Route from "components/ProfiledRoute";

export default function SettingsRoutes() {
  return (
    <Switch>
      <Route exact path="/settings" component={Profile} />
      <Route exact path="/settings/details" component={Details} />
      <Route exact path="/settings/security" component={Security} />
      <Route exact path="/settings/people" component={People} />
      <Route exact path="/settings/people/:filter" component={People} />
      <Route exact path="/settings/groups" component={Groups} />
      <Route exact path="/settings/shares" component={Shares} />
      <Route exact path="/settings/tokens" component={Tokens} />
      <Route exact path="/settings/notifications" component={Notifications} />
      <Route exact path="/settings/integrations/slack" component={Slack} />
      <Route exact path="/settings/integrations/zapier" component={Zapier} />
      <Route exact path="/settings/import-export" component={ImportExport} />
    </Switch>
  );
}
