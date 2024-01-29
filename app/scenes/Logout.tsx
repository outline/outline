import * as React from "react";
import { Redirect } from "react-router-dom";
import useStores from "~/hooks/useStores";

const Logout = () => {
  const { auth } = useStores();
  void auth.logout();
  return <Redirect to="/" />;
};

export default Logout;
