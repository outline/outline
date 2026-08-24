import { observer } from "mobx-react";
import { Suspense } from "react";
import { Switch } from "react-router-dom";
import Error404 from "~/scenes/Errors/Error404";
import AuthenticatedLayout from "~/components/AuthenticatedLayout";
import CenteredContent from "~/components/CenteredContent";
import PlaceholderNote from "~/components/PlaceholderNote";
import Route from "~/components/ProfiledRoute";
import { SplitView } from "~/components/SplitView";
import { RequireRole } from "~/components/RequireRole";
import lazy from "~/utils/lazyWithRetry";
import * as Scenes from "./scenes";
const SettingsRoutes = lazy(() => import("./settings"));
/**
 * The authenticated routes are all the routes of the application that require
 * the user to be logged in.
 */
function AuthenticatedRoutes() {
  return (
    <AuthenticatedLayout>
      <Suspense
        fallback={
          <CenteredContent>
            <PlaceholderNote />
          </CenteredContent>
        }
      >
        <SplitView>
          <RequireRole>
            <Switch>
              <Route
                exact
                path="/dashboard"
                component={Scenes.Dashboard.Component}
              />
              <Route exact path="/pos" component={Scenes.Pos.Component} />
              <Route exact path="/orders" component={Scenes.Orders.Component} />
              <Route
                exact
                path="/orders/:orderId"
                component={Scenes.OrderDetail.Component}
              />
              <Route
                exact
                path="/inventory"
                component={Scenes.Inventory.Component}
              />
              <Route
                exact
                path="/accounting"
                component={Scenes.Accounting.Component}
              />
              <Route
                exact
                path="/grooming"
                component={Scenes.Grooming.Component}
              />
              <Route
                exact
                path="/loyalty"
                component={Scenes.Loyalty.Component}
              />
              <Route
                exact
                path="/whatsapp"
                component={Scenes.Whatsapp.Component}
              />
              <Route exact path="/staff" component={Scenes.Staff.Component} />
              <Route
                exact
                path="/branches"
                component={Scenes.Branches.Component}
              />
              <Route
                exact
                path="/occupancy"
                component={Scenes.Occupancy.Component}
              />
              <Route
                exact
                path="/boardings"
                component={Scenes.Boardings.Component}
              />
              <Route
                exact
                path="/boardings/new"
                component={Scenes.BoardingNew.Component}
              />
              <Route
                exact
                path="/boardings/:boardingId"
                component={Scenes.BoardingDetail.Component}
              />
              <Route
                exact
                path="/invoices"
                component={Scenes.Invoices.Component}
              />
              <Route
                exact
                path="/invoices/new"
                component={Scenes.InvoiceNew.Component}
              />
              <Route
                exact
                path="/invoices/:invoiceId"
                component={Scenes.InvoiceDetail.Component}
              />
              <Route exact path="/portal" component={Scenes.Portal.Component} />
              <Route
                exact
                path="/returns"
                component={Scenes.Returns.Component}
              />
              <Route
                exact
                path="/customers/:customerId"
                component={Scenes.CustomerDetail.Component}
              />
              <Route
                exact
                path="/staff/:staffId"
                component={Scenes.StaffDetail.Component}
              />
              <Route
                exact
                path="/purchase-orders"
                component={Scenes.PurchaseOrders.Component}
              />
              <Route
                exact
                path="/purchase-orders/new"
                component={Scenes.PurchaseOrderNew.Component}
              />
              <Route
                exact
                path="/purchase-orders/:purchaseOrderId"
                component={Scenes.PurchaseOrderDetail.Component}
              />
              <Route
                exact
                path="/products"
                component={Scenes.Products.Component}
              />
              <Route
                exact
                path="/customers"
                component={Scenes.Customers.Component}
              />
              <Route path="/settings" component={SettingsRoutes} />
              <Route component={Error404} />
            </Switch>
          </RequireRole>
        </SplitView>
      </Suspense>
    </AuthenticatedLayout>
  );
}
export default observer(AuthenticatedRoutes);
