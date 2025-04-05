import { MoreIcon } from "outline-icons";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import Flex from "@shared/components/Flex";
import { s } from "@shared/styles";
import { Avatar, AvatarSize } from "~/components/Avatar";
import ButtonLarge from "~/components/ButtonLarge";
import ChangeLanguage from "~/components/ChangeLanguage";
import Heading from "~/components/Heading";
import LoadingIndicator from "~/components/LoadingIndicator";
import PageTitle from "~/components/PageTitle";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useQuery from "~/hooks/useQuery";
import useRequest from "~/hooks/useRequest";
import { client } from "~/utils/ApiClient";
import { detectLanguage } from "~/utils/language";
import { OAuthScopeHelper } from "./OAuthScopeHelper";
import { Background } from "./components/Background";
import { Centered } from "./components/Centered";

function Authorize() {
  const team = useCurrentTeam();
  const params = useQuery();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const timeoutRef = React.useRef<number>();
  const clientId = params.get("client_id");
  const clientSecret = params.get("client_secret");
  const redirectUri = params.get("redirect_uri");
  const responseType = params.get("response_type");
  const state = params.get("state");
  const scope = params.get("scope");
  const [scopes] = React.useState(() => scope?.split(" ") ?? []);
  const {
    error: clientError,
    data: response,
    request,
  } = useRequest(() => client.post("/oauthClients.info", { clientId }));

  React.useEffect(() => {
    if (clientId) {
      void request();
    }
  }, []);

  const handleCancel = () => {
    window.location.href = redirectUri ?? "/";
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    timeoutRef.current = window.setTimeout(() => setIsSubmitting(false), 3000);
  };

  React.useEffect(
    () => () => {
      timeoutRef.current && window.clearTimeout(timeoutRef.current);
    },
    []
  );

  const missingParams = [
    !clientId && "client_id",
    !clientSecret && "client_secret",
    !redirectUri && "redirect_uri",
    !responseType && "response_type",
    !state && "state",
    !scope && "scope",
  ].filter(Boolean);

  if (missingParams.length || clientError) {
    return (
      <Background>
        <ChangeLanguage locale={detectLanguage()} />
        <Centered>
          <StyledHeading>{t("An error occurred")}</StyledHeading>
          {clientError ? (
            <Text as="p" type="secondary">
              {t(
                "The OAuth client could not be found, please check the provided client ID"
              )}
              <Pre>{clientId}</Pre>
            </Text>
          ) : (
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
          )}
        </Centered>
      </Background>
    );
  }

  if (!response) {
    return <LoadingIndicator />;
  }

  const { name, developerName, developerUrl } = response.data;

  return (
    <Background>
      <PageTitle title={t("Authorize")} />
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
          {t(`{{ appName }} wants to access {{ teamName }}`, {
            appName: name,
            teamName: team.name,
          })}
        </StyledHeading>
        {developerName && (
          <Text type="secondary" as="p" style={{ marginTop: -12 }}>
            <Trans
              defaults="By <em>{{ developerName }}</em>"
              values={{
                developerName,
              }}
              components={{
                em: developerUrl ? (
                  <Text
                    as="a"
                    type="secondary"
                    weight="bold"
                    href={developerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                ) : (
                  <strong />
                ),
              }}
            />
          </Text>
        )}
        <Text type="tertiary" as="p">
          {t(
            "{{ appName }} will be able to access your account and perform the following actions:",
            {
              appName: name,
            }
          )}
        </Text>
        <ul style={{ width: "100%", paddingLeft: "1em", marginTop: 0 }}>
          {OAuthScopeHelper.normalizeScopes(scopes).map((item) => (
            <li key={item}>
              <Text type="secondary">{item}</Text>
            </li>
          ))}
        </ul>
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
          <Flex gap={8} justify="space-between">
            <Button type="button" onClick={handleCancel} neutral>
              {t("Cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              {t("Authorize")}
            </Button>
          </Flex>
        </form>
      </Centered>
    </Background>
  );
}

const Logo = styled(Avatar)`
  border-radius: 8px;
`;

const Button = styled(ButtonLarge)`
  width: calc(50% - 4px);
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
