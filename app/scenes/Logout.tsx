import env from "@shared/env";
import * as React from "react";
import { Redirect } from "react-router-dom";
import useStores from "~/hooks/useStores";

const Logout = () => {
  const { auth } = useStores();
  void auth.logout();
  if (env.OIDC_LOGOUT_URI)
    window.location.replace(env.OIDC_LOGOUT_URI);
  return <Redirect to="/" />;
};

export default Logout;
