import * as React from "react";
import { Redirect } from "react-router-dom";
import env from "~/env";
import useStores from "~/hooks/useStores";
import { logoutPath } from "~/utils/routeHelpers";

const Logout = () => {
  const { auth } = useStores();

  void auth.logout().then(() => {
    if (env.OIDC_LOGOUT_URI) {
      setTimeout(() => {
        // If the logout URI contains a template for the id_token, replace it
        let logoutUri = env.OIDC_LOGOUT_URI;
        if (auth.idToken && logoutUri.includes("{id_token}")) {
          logoutUri = logoutUri.replace("{id_token}", auth.idToken);
        }
        window.location.replace(logoutUri);
      }, 200);
    }
  });

  if (env.OIDC_LOGOUT_URI) {
    return null; // user will be redirected to logout URI after logout
  }
  return <Redirect to={logoutPath()} />;
};

export default Logout;
