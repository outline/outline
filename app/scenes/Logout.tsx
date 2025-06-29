import { Redirect } from "react-router-dom";
import env from "~/env";
import useStores from "~/hooks/useStores";
import { logoutPath } from "~/utils/routeHelpers";

const Logout = () => {
  const { auth } = useStores();

  void auth.logout({ userInitiated: true });

  if (env.OIDC_LOGOUT_URI) {
    return null; // user will be redirected to logout URI after logout
  }
  return <Redirect to={logoutPath()} />;
};

export default Logout;
