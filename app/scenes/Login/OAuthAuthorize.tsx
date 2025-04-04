import { MoreIcon } from "outline-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Flex from "@shared/components/Flex";
import { s } from "@shared/styles";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Button from "~/components/Button";
import ChangeLanguage from "~/components/ChangeLanguage";
import Heading from "~/components/Heading";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useQuery from "~/hooks/useQuery";
import useRequest from "~/hooks/useRequest";
import { client } from "~/utils/ApiClient";
import { detectLanguage } from "~/utils/language";
import { Background } from "./components/Background";
import { Centered } from "./components/Centered";

function Authorize() {
  const team = useCurrentTeam();
  const params = useQuery();
  const { t } = useTranslation();
  const clientId = params.get("client_id");
  const clientSecret = params.get("client_secret");
  const redirectUri = params.get("redirect_uri");
  const responseType = params.get("response_type");
  const state = params.get("state");
  const scope = params.get("scope");
  const [scopes] = React.useState(() => scope?.split(" ") ?? []);
  const {
    error,
    data: response,
    request,
  } = useRequest(() => client.post("/oauthClients.info", { clientId }));

  React.useEffect(() => {
    if (clientId) {
      void request();
    }
  }, []);

  const missingParams = [
    !clientId && "client_id",
    !clientSecret && "client_secret",
    !redirectUri && "redirect_uri",
    !responseType && "response_type",
    !state && "state",
    !scope && "scope",
  ].filter(Boolean);

  if (missingParams.length) {
    return (
      <Background>
        <ChangeLanguage locale={detectLanguage()} />
        <Centered>
          <StyledHeading>{t("Error")}</StyledHeading>
          <Text as="p" type="secondary">
            {t("Required OAuth parameters are missing")}
            <Pre>
              {missingParams.map((param) => (
                <>
                  {param}
                  <br />
                </>
              ))}
            </Pre>
          </Text>
        </Centered>
      </Background>
    );
  }

  if (error) {
    return (
      <Background>
        <ChangeLanguage locale={detectLanguage()} />
        <Centered>
          <StyledHeading>{t("Error")}</StyledHeading>
          <p>{t("Unable to load OAuth client")}</p>
        </Centered>
      </Background>
    );
  }

  if (!response) {
    // TODO
    return null;
  }

  return (
    <Background>
      <ChangeLanguage locale={detectLanguage()} />

      <Centered gap={12}>
        <Flex gap={8} align="center">
          <Logo
            model={{
              avatarUrl: response.data.avatarUrl,
              initial: response.data.name[0],
            }}
            size={AvatarSize.XXLarge}
            alt={t("Logo")}
          />{" "}
          <MoreIcon />{" "}
          <Logo model={team} size={AvatarSize.XXLarge} alt={t("Logo")} />
        </Flex>
        <StyledHeading>
          {response.data.name} wants to access {team.name}
        </StyledHeading>
        <p>
          {scopes.map((item) => (
            <>
              {item}
              <br />
            </>
          ))}
        </p>
        <form method="POST" action="/oauth/authorize" style={{ width: "100%" }}>
          <input type="hidden" name="client_id" value={clientId ?? ""} />
          <input
            type="hidden"
            name="client_secret"
            value={clientSecret ?? ""}
          />
          <input type="hidden" name="redirect_uri" value={redirectUri ?? ""} />
          <input
            type="hidden"
            name="response_type"
            value={responseType ?? ""}
          />
          <input type="hidden" name="state" value={state ?? ""} />
          <input type="hidden" name="scope" value={scope ?? ""} />
          <Button type="submit" large fullwidth>
            {t("Authorize")}
          </Button>
        </form>
      </Centered>
    </Background>
  );
}

const Logo = styled(Avatar)`
  border-radius: 8px;
`;

const StyledHeading = styled(Heading).attrs({
  as: "h2",
  centered: true,
})`
  margin-top: 0;
`;

const Pre = styled.pre`
  background: ${s("backgroundSecondary")};
  padding: 16px;
  border-radius: 4px;
  font-size: 12px;
  white-space: pre-wrap;
`;

export default Authorize;
