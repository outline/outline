import { observer } from "mobx-react";
import { Suspense } from "react";
import type { RouteComponentProps } from "react-router-dom";
import { Switch, Redirect } from "react-router-dom";
import NoteNew from "~/scenes/NoteNew";
import Error404 from "~/scenes/Errors/Error404";
import AuthenticatedLayout from "~/components/AuthenticatedLayout";
import CenteredContent from "~/components/CenteredContent";
import PlaceholderNote from "~/components/PlaceholderNote";
import Route from "~/components/ProfiledRoute";
import { SplitView } from "~/components/SplitView";
import WebsocketProvider from "~/components/WebsocketProvider";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useQueryNotices from "~/hooks/useQueryNotices";
import useKeyboardShortcutsQuery from "~/hooks/useKeyboardShortcutsQuery";
import { RequireRole } from "~/components/RequireRole";
import lazy from "~/utils/lazyWithRetry";
import * as Scenes from "./scenes";
import {
  archivePath,
  draftsPath,
  homePath,
  searchPath,
  settingsPath,
  matchNoteSlug as noteSlug,
  matchNotebookSlug as notebookSlug,
  legacyNotebookPath,
  trashPath,
  debugPath,
} from "~/utils/routeHelpers";
import env from "~/env";
const SettingsRoutes = lazy(() => import("./settings"));
const Debug = lazy(() => import("~/scenes/Developer/Debug"));
const Changesets = lazy(() => import("~/scenes/Developer/Changesets"));
const RedirectNote = ({
  match,
}: RouteComponentProps<{
  noteSlug: string;
}>) => (
  <Redirect
    to={match.params.noteSlug ? `/doc/${match.params.noteSlug}` : homePath()}
  />
);
const RedirectLegacyNotebook = ({ location }: RouteComponentProps) => (
  <Redirect
    to={legacyNotebookPath(location.pathname, location.search, location.hash)}
  />
);
/**
 * The authenticated routes are all the routes of the application that require
 * the user to be logged in.
 */
function AuthenticatedRoutes() {
  useQueryNotices();
  useKeyboardShortcutsQuery();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  return (
    <WebsocketProvider>
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
                {can.createNote && (
                  <Route
                    exact
                    path={draftsPath()}
                    component={Scenes.Drafts.Component}
                  />
                )}
                {can.createNote && (
                  <Route
                    exact
                    path={archivePath()}
                    component={Scenes.Archive.Component}
                  />
                )}
                {can.createNote && (
                  <Route
                    exact
                    path={trashPath()}
                    component={Scenes.Trash.Component}
                  />
                )}
                <Route
                  path={`${homePath()}/:tab?`}
                  component={Scenes.Home.Component}
                />
                <Route
                  exact
                  path="/dashboard"
                  component={Scenes.Dashboard.Component}
                />
                <Route exact path="/pos" component={Scenes.Pos.Component} />
                <Route
                  exact
                  path="/orders"
                  component={Scenes.Orders.Component}
                />
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
                />{" "}
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
                <Route
                  exact
                  path="/portal"
                  component={Scenes.Portal.Component}
                />
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
                <Redirect exact from="/starred" to={homePath()} />
                <Redirect
                  exact
                  from="/templates"
                  to={settingsPath("templates")}
                />
                <Route
                  exact
                  path={["/collections/*", "/collection/*"]}
                  component={RedirectLegacyNotebook}
                />
                <Route
                  exact
                  path={`/notebook/${notebookSlug}/new`}
                  component={NoteNew}
                />
                <Route
                  exact
                  path={`/notebook/${notebookSlug}/overview/edit`}
                  component={Scenes.Notebook.Component}
                />
                <Route
                  exact
                  path={`/notebook/${notebookSlug}/:tab?`}
                  component={Scenes.Notebook.Component}
                />
                <Route exact path="/doc/new" component={NoteNew} />
                <Route exact path={`/d/${noteSlug}`} component={RedirectNote} />
                <Route
                  exact
                  path={`/doc/${noteSlug}/history/:revisionId?`}
                  component={Scenes.Note.Component}
                />
                <Route
                  exact
                  path={`/doc/${noteSlug}/edit`}
                  component={Scenes.Note.Component}
                />
                <Route
                  path={`/doc/${noteSlug}`}
                  component={Scenes.Note.Component}
                />
                <Route
                  exact
                  path={`${searchPath()}/:query?`}
                  component={Scenes.Search.Component}
                />
                {env.isDevelopment && (
                  <Route exact path={debugPath()} component={Debug} />
                )}
                {env.isDevelopment && (
                  <Route
                    exact
                    path={`${debugPath()}/changesets`}
                    component={Changesets}
                  />
                )}
                <Route exact path="/404" component={Error404} />
                <SettingsRoutes />
                <Route component={Error404} />
              </Switch>
            </RequireRole>
          </SplitView>
        </Suspense>
      </AuthenticatedLayout>
    </WebsocketProvider>
  );
}
export default observer(AuthenticatedRoutes);
