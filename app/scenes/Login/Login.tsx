import find from "lodash/find";
import { observer } from "mobx-react";
import { EmailIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { useLocation, Link, Redirect } from "react-router-dom";
import styled from "styled-components";
import { getCookie, setCookie } from "tiny-cookie";
import { s } from "@shared/styles";
import { UserPreference } from "@shared/types";
import { parseDomain } from "@shared/utils/domains";
import { Config } from "~/stores/AuthStore";
import { AvatarSize } from "~/components/Avatar";
import ButtonLarge from "~/components/ButtonLarge";
import ChangeLanguage from "~/components/ChangeLanguage";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import OutlineIcon from "~/components/Icons/OutlineIcon";
import Input from "~/components/Input";
import LoadingIndicator from "~/components/LoadingIndicator";
import PageTitle from "~/components/PageTitle";
import TeamLogo from "~/components/TeamLogo";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentUser from "~/hooks/useCurrentUser";
import {
  useLastVisitedPath,
  usePostLoginPath,
} from "~/hooks/useLastVisitedPath";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import Desktop from "~/utils/Desktop";
import isCloudHosted from "~/utils/isCloudHosted";
import { detectLanguage } from "~/utils/language";
import { homePath } from "~/utils/routeHelpers";
import AuthenticationProvider from "./components/AuthenticationProvider";
import { BackButton } from "./components/BackButton";
import { Background } from "./components/Background";
import { Centered } from "./components/Centered";
import { Notices } from "./components/Notices";
import { getRedirectUrl, navigateToSubdomain } from "./urls";

type Props = {
  children?: (config?: Config) => React.ReactNode;
  onBack?: () => void;
};

function Login({ children, onBack }: Props) {
  const location = useLocation();
  const query = useQuery();
  const notice = query.get("notice");

  const { t } = useTranslation();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const { auth } = useStores();
  const { config } = auth;
  const [error, setError] = React.useState(null);
  const [emailLinkSentTo, setEmailLinkSentTo] = React.useState("");
  const isCreate = location.pathname === "/create";
  const rememberLastPath = !!user?.getPreference(
    UserPreference.RememberLastPath
  );
  const [lastVisitedPath] = useLastVisitedPath();
  const [spendPostLoginPath] = usePostLoginPath();

  const handleReset = React.useCallback(() => {
    setEmailLinkSentTo("");
  }, []);
  const handleEmailSuccess = React.useCallback((email) => {
    setEmailLinkSentTo(email);
  }, []);

  const handleGoSubdomain = React.useCallback(async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    await navigateToSubdomain(data.subdomain.toString());
  }, []);

  React.useEffect(() => {
    auth.fetchConfig().catch(setError);
  }, [auth]);

  React.useEffect(() => {
    const entries = Object.fromEntries(query.entries());
    const existing = getCookie("signupQueryParams");

    // We don't want to set this cookie if we're viewing an error notice via
    // query string(notice =), if there are no query params, or it's already set
    if (Object.keys(entries).length && !query.get("notice") && !existing) {
      setCookie("signupQueryParams", JSON.stringify(entries));
    }
  }, [query]);

  if (auth.authenticated) {
    const postLoginPath = spendPostLoginPath();
    if (postLoginPath) {
      return <Redirect to={postLoginPath} />;
    }

    if (rememberLastPath && lastVisitedPath !== location.pathname) {
      return <Redirect to={lastVisitedPath} />;
    }

    if (auth.team?.defaultCollectionId) {
      return <Redirect to={`/collection/${auth.team?.defaultCollectionId}`} />;
    }

    return <Redirect to={homePath()} />;
  }

  if (error) {
    return (
      <Background>
        <BackButton onBack={onBack} />
        <ChangeLanguage locale={detectLanguage()} />
        <Centered>
          <PageTitle title={t("Login")} />
          <Heading centered>{t("Error")}</Heading>
          <Note>
            {t("Failed to load configuration.")}
            {!isCloudHosted && (
              <p>
                {t(
                  "Check the network requests and server logs for full details of the error."
                )}
              </p>
            )}
          </Note>
        </Centered>
      </Background>
    );
  }

  // we're counting on the config request being fast, so just a simple loading
  // indicator here that's delayed by 250ms
  if (!config) {
    return <LoadingIndicator />;
  }

  const isCustomDomain = parseDomain(window.location.origin).custom;

  // Unmapped custom domain
  if (isCloudHosted && isCustomDomain && !config.name) {
    return (
      <Background>
        <BackButton onBack={onBack} config={config} />
        <ChangeLanguage locale={detectLanguage()} />
        <Centered>
          <PageTitle title={t("Custom domain setup")} />
          <Heading centered>{t("Almost there")}…</Heading>
          <Note>
            {t(
              "Your custom domain is successfully pointing at Outline. To complete the setup process please contact support."
            )}
          </Note>
        </Centered>
      </Background>
    );
  }

  if (Desktop.isElectron() && notice === "domain-required") {
    return (
      <Background>
        <BackButton onBack={onBack} config={config} />
        <ChangeLanguage locale={detectLanguage()} />

        <Centered as="form" onSubmit={handleGoSubdomain}>
          <Heading centered>{t("Choose workspace")}</Heading>
          <Note>
            {t(
              "This login method requires choosing your workspace to continue"
            )}
            …
          </Note>
          <Flex>
            <Input
              name="subdomain"
              style={{ textAlign: "right" }}
              placeholder={t("subdomain")}
              pattern="^[a-z\d-]+$"
              required
            >
              <Domain>.getoutline.com</Domain>
            </Input>
          </Flex>
          <ButtonLarge type="submit" fullwidth>
            {t("Continue")}
          </ButtonLarge>
        </Centered>
      </Background>
    );
  }

  const hasMultipleProviders = config.providers.length > 1;
  const defaultProvider = find(
    config.providers,
    (provider) => provider.id === auth.lastSignedIn && !isCreate
  );

  if (emailLinkSentTo) {
    return (
      <Background>
        <BackButton onBack={onBack} config={config} />
        <Centered>
          <PageTitle title={t("Check your email")} />
          <CheckEmailIcon size={38} />
          <Heading centered>{t("Check your email")}</Heading>
          <Note>
            <Trans
              defaults="A magic sign-in link has been sent to the email <em>{{ emailLinkSentTo }}</em> if an account exists."
              values={{ emailLinkSentTo }}
              components={{ em: <em /> }}
            />
          </Note>
          <br />
          <ButtonLarge onClick={handleReset} fullwidth neutral>
            {t("Back to login")}
          </ButtonLarge>
        </Centered>
      </Background>
    );
  }

  // If there is only one provider and it's OIDC, redirect immediately.
  if (
    config.providers.length === 1 &&
    config.providers[0].id === "oidc" &&
    !env.OIDC_DISABLE_REDIRECT &&
    !query.get("notice") &&
    !query.get("logout")
  ) {
    window.location.href = getRedirectUrl(config.providers[0].authUrl);
    return null;
  }

  return (
    <Background>
      <BackButton onBack={onBack} config={config} />
      <ChangeLanguage locale={detectLanguage()} />

      <Centered gap={12}>
        <PageTitle
          title={config.name ? `${config.name} – ${t("Login")}` : t("Login")}
        />
        <Logo>
          {config.logo && !isCreate ? (
            <TeamLogo size={AvatarSize.XXLarge} src={config.logo} />
          ) : (
            <OutlineIcon size={AvatarSize.XXLarge} />
          )}
        </Logo>
        {isCreate ? (
          <>
            <StyledHeading as="h2" centered>
              {t("Create a workspace")}
            </StyledHeading>
            <Content>
              {t(
                "Get started by choosing a sign-in method for your new workspace below…"
              )}
            </Content>
          </>
        ) : (
          <>
            <StyledHeading as="h2" centered>
              {t("Login to {{ authProviderName }}", {
                authProviderName: config.name || env.APP_NAME,
              })}
            </StyledHeading>
            {children?.(config)}
          </>
        )}
        <Notices />
        {defaultProvider && (
          <React.Fragment key={defaultProvider.id}>
            <AuthenticationProvider
              isCreate={isCreate}
              onEmailSuccess={handleEmailSuccess}
              {...defaultProvider}
            />
            {hasMultipleProviders && (
              <>
                <Note>
                  {t("You signed in with {{ authProviderName }} last time.", {
                    authProviderName: defaultProvider.name,
                  })}
                </Note>
                <Or data-text={t("Or")} />
              </>
            )}
          </React.Fragment>
        )}
        {config.providers.map((provider) => {
          if (defaultProvider && provider.id === defaultProvider.id) {
            return null;
          }

          return (
            <AuthenticationProvider
              key={provider.id}
              isCreate={isCreate}
              onEmailSuccess={handleEmailSuccess}
              neutral={defaultProvider && hasMultipleProviders}
              {...provider}
            />
          );
        })}
        {isCreate && (
          <Note>
            <Trans>
              Already have an account? Go to <Link to="/">login</Link>.
            </Trans>
          </Note>
        )}
      </Centered>
    </Background>
  );
}

const StyledHeading = styled(Heading)`
  margin: 0;
`;

const Domain = styled.div`
  color: ${s("textSecondary")};
  padding: 0 8px 0 0;
`;

const CheckEmailIcon = styled(EmailIcon)`
  margin-bottom: -1.5em;
`;

const Logo = styled.div`
  margin-bottom: -4px;
`;

const Content = styled(Text)`
  color: ${s("textSecondary")};
  text-align: center;
  margin-top: -8px;
`;

const Note = styled(Text)`
  color: ${s("textTertiary")};
  text-align: center;
  font-size: 14px;
  margin-top: 8px;

  em {
    font-style: normal;
    font-weight: 500;
  }
`;

const Or = styled.hr`
  margin: 1em 0;
  position: relative;
  width: 100%;
  border: 0;
  border-top: 1px solid ${s("divider")};

  &:after {
    content: attr(data-text);
    display: block;
    position: absolute;
    left: 50%;
    transform: translate3d(-50%, -50%, 0);
    text-transform: uppercase;
    font-size: 11px;
    font-weight: 500;
    color: ${s("textTertiary")};
    background: ${s("background")};
    border-radius: 2px;
    padding: 0 4px;
  }
`;

export default observer(Login);
