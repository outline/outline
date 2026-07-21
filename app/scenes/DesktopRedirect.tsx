import { useEffect } from "react";
import styled from "styled-components";
import Flex from "~/components/Flex";
import useQuery from "~/hooks/useQuery";
import { SigningIn } from "./Login/components/SigningIn";

const DesktopRedirect = () => {
  const params = useQuery();
  const token = params.get("token");

  useEffect(() => {
    if (token) {
      window.open(
        `outline://${window.location.host}/auth/redirect?token=${token}`,
        "_self"
      );

      // Clean the url after a short delay so it's not possible to hit reload, re-using the transfer token
      // will not work and changing the location immediately cancels the window.open call in Safari.
      setTimeout(() => (window.location.search = ""), 500);
    }
  }, [token]);

  return (
    <Centered align="center" justify="center" column auto>
      <SigningIn />
    </Centered>
  );
};

const Centered = styled(Flex)`
  user-select: none;
  width: 90vw;
  height: 100%;
  max-width: 320px;
  margin: 0 auto;
`;

export default DesktopRedirect;
