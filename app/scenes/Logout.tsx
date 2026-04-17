import useStores from "~/hooks/useStores";

const Logout = () => {
  const { auth } = useStores();

  void auth.logout({ userInitiated: true });

  // AuthStore.logout() always sets logoutRedirectUri to the portal host; the
  // unauthenticated branch in Authenticated.tsx performs the actual navigation.
  return null;
};

export default Logout;
