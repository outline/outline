import React from "react";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import Flex from "@shared/components/Flex";
import { s } from "@shared/styles";
import { parseDomain } from "@shared/utils/domains";
import type OAuthClient from "~/models/oauth/OAuthClient";
import ButtonLarge from "~/components/ButtonLarge";
import ChangeLanguage from "~/components/ChangeLanguage";
import Heading from "~/components/Heading";
import LoadingIndicator from "~/components/LoadingIndicator";
import PageTitle from "~/components/PageTitle";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { useLoggedInSessions } from "~/hooks/useLoggedInSessions";
import useQuery from "~/hooks/useQuery";
import useRequest from "~/hooks/useRequest";
import { client } from "~/utils/ApiClient";
import { BadRequestError, NotFoundError } from "~/utils/errors";
import isCloudHosted from "~/utils/isCloudHosted";
import { detectLanguage } from "~/utils/language";
import Login from "./Login";
import { OAuthScopeHelper } from "./OAuthScopeHelper";
import { Background } from "./components/Background";
import { Centered } from "./components/Centered";
import { ConnectHeader } from "./components/ConnectHeader";
import { TeamSwitcher } from "./components/TeamSwitcher";

export default function OAuthAuthorize() {
  const team = useCurrentTeam({ rejectOnEmpty: false });
  const sessions = useLoggedInSessions();

  // We're self-hosted or on a team subdomain already, just show the authorize screen.
  if (team) {
    return <Authorize />;
  }

  // Cloud hosted and on root domain – show the workspace switcher.
  const isAppRoot =
    parseDomain(window.location.hostname).host === parseDomain(env.URL).host;
  const hasLoggedInSessions = Object.keys(sessions).length > 0;
  if (isCloudHosted && hasLoggedInSessions && isAppRoot) {
    return <TeamSwitcher sessions={sessions} />;
  }

  return <Login />;
}

/**
 * Authorize component is responsible for handling the OAuth authorization process.
 * It retrieves the OAuth client information, displays the authorization request,
 * and allows the user to either authorize or cancel the request.
 */
function Authorize() {
  const team = useCurrentTeam();
  const params = useQuery();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const timeoutRef = React.useRef<number>();
  const {
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: responseType,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    state,
    scope,
  } = Object.fromEntries(params);
  const [scopes] = React.useState(() => scope?.split(" ") ?? []);
  const { error: clientError, data: response } = useRequest<{
    data: OAuthClient;
  }>(() => client.post("/oauthClients.info", { clientId, redirectUri }), true);

  const handleCancel = () => {
    if (redirectUri && !clientError) {
      const url = new URL(redirectUri);
      url.searchParams.set("error", "access_denied");
      window.location.href = url.toString();
      return;
    }
    if (window.history.length) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    timeoutRef.current = window.setTimeout(() => setIsSubmitting(false), 5000);
  };

  React.useEffect(
    () => () => {
      timeoutRef.current && window.clearTimeout(timeoutRef.current);
    },
    []
  );

  const missingParams = [
    !clientId && "client_id",
    !redirectUri && "redirect_uri",
    !responseType && "response_type",
    !scope && "scope",
    !state && "state",
  ].filter(Boolean);

  if (missingParams.length || clientError) {
    return (
      <Background>
        <Centered>
          <StyledHeading>{t("An error occurred")}</StyledHeading>
          {clientError instanceof NotFoundError ? (
            <Text as="p" type="secondary">
              {t(
                "The OAuth client could not be found, please check the provided client ID"
              )}
              <Pre>{clientId}</Pre>
            </Text>
          ) : clientError instanceof BadRequestError ? (
            <Text as="p" type="secondary">
              {t(
                "The OAuth client could not be loaded, please check the redirect URI is valid"
              )}
              <Pre>{redirectUri}</Pre>
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
      <ChangeLanguage locale={detectLanguage()} />
      <PageTitle title={t("Authorize")} />
      <Centered gap={12}>
        <ConnectHeader team={team} oauthClient={response.data} />
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
            "{{ appName }} will be able to access your account and perform the following actions",
            {
              appName: name,
            }
          )}
          :
        </Text>
        <ul style={{ width: "100%", paddingLeft: "1em", marginTop: 0 }}>
          {OAuthScopeHelper.normalizeScopes(scopes, t).map((item) => (
            <li key={item}>
              <Text type="secondary">{item}</Text>
            </li>
          ))}
        </ul>
        <form
          method="POST"
          action="/oauth/authorize"
          style={{ width: "100%" }}
          onSubmit={handleSubmit}
        >
          <input type="hidden" name="client_id" value={clientId ?? ""} />
          <input type="hidden" name="redirect_uri" value={redirectUri ?? ""} />
          <input
            type="hidden"
            name="response_type"
            value={responseType ?? ""}
          />
          <input type="hidden" name="state" value={state ?? ""} />
          <input type="hidden" name="scope" value={scope ?? ""} />
          {codeChallenge && (
            <input type="hidden" name="code_challenge" value={codeChallenge} />
          )}
          {codeChallengeMethod && (
            <input
              type="hidden"
              name="code_challenge_method"
              value={codeChallengeMethod}
            />
          )}
          <Flex gap={8} justify="space-between">
            <Button type="button" onClick={handleCancel} neutral>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {t("Authorize")}
            </Button>
          </Flex>
        </form>
      </Centered>
    </Background>
  );
}

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
