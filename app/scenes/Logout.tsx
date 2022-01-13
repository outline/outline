import * as React from "react";
import { Redirect } from "react-router-dom";
import useStores from "~/hooks/useStores";

const Logout = () => {
  const { auth } = useStores();
  auth.logout();
  return <Redirect to="/" />;
};

export default Logout;
