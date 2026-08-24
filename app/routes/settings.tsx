import { Switch } from "react-router-dom";
import Error404 from "~/scenes/Errors/Error404";
import { createLazyComponent as lazy } from "~/components/LazyLoad";
import Route from "~/components/ProfiledRoute";
const Billing = lazy(() => import("~/scenes/Settings/Billing"));
const Receipts = lazy(() => import("~/scenes/Settings/Receipts"));
const Notes = lazy(() => import("~/scenes/Settings/Notes"));
const Audit = lazy(() => import("~/scenes/Settings/Audit"));
function SettingsRoutes() {
  return (
    <Switch>
      <Route exact path="/settings/billing" component={Billing.Component} />
      <Route exact path="/settings/receipts" component={Receipts.Component} />
      <Route exact path="/settings/documents" component={Notes.Component} />
      <Route exact path="/settings/activity" component={Audit.Component} />
      <Route component={Error404} />
    </Switch>
  );
}
export default SettingsRoutes;
