import find from "lodash/find";
import { observer } from "mobx-react";
import { EmailIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { useLocation, Link, Redirect } from "react-router-dom";
import styled from "styled-components";
import { getCookie, setCookie } from "tiny-cookie";
import { s } from "@shared/styles";
import { Client, UserPreference } from "@shared/types";
import { CSRF } from "@shared/constants";
import { isPWA } from "@shared/utils/browser";
import { parseDomain } from "@shared/utils/domains";
import type { Config } from "~/stores/AuthStore";
import { AvatarSize } from "~/components/Avatar";
import ButtonLarge from "~/components/ButtonLarge";
import ChangeLanguage from "~/components/ChangeLanguage";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import OutlineIcon from "~/components/Icons/OutlineIcon";
import Input from "~/components/Input";
import LoadingIndicator from "~/components/LoadingIndicator";
import { OneTimePasswordInput } from "~/components/OneTimePasswordInput";
import PageTitle from "~/components/PageTitle";
import TeamLogo from "~/components/TeamLogo";
import Text from "~/components/Text";
import InputLarge from "~/components/InputLarge";
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
import lazyWithRetry from "~/utils/lazyWithRetry";
import ForgotPasswordModal from "./components/ForgotPasswordModal";

const WorkspaceSetup = lazyWithRetry(
  () => import("./components/WorkspaceSetup")
);

type Props = {
  children?: (config?: Config) => React.ReactNode;
  onBack?: () => void;
};

function Login({ children, onBack }: Props) {
  const location = useLocation();
  const query = useQuery();
  const notice = query.get("notice");
  const forceOTP = query.get("forceOTP");
  const resetToken = query.get("resetToken");

  const { t } = useTranslation();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const { auth } = useStores();
  const { config } = auth;
  const backButtonConfig = config ?? undefined;
  const [error, setError] = React.useState(null);
  const [emailLinkSentTo, setEmailLinkSentTo] = React.useState("");
  const isCreate = location.pathname === "/create";
  const clientType = Desktop.isElectron() ? Client.Desktop : Client.Web;
  const rememberLastPath = !!user?.getPreference(
    UserPreference.RememberLastPath
  );
  const [lastVisitedPath] = useLastVisitedPath();
  const [spendPostLoginPath] = usePostLoginPath();
  const [resetEmailSentTo, setResetEmailSentTo] = React.useState("");
  const [isForgotPasswordOpen, setForgotPasswordOpen] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [isPasswordAuthExpanded, setPasswordAuthExpanded] = React.useState(false);
  const csrfToken = getCookie(CSRF.cookieName) ?? "";

  const handleReset = React.useCallback(() => {
    setEmailLinkSentTo("");
  }, []);

  const handleEmailSuccess = React.useCallback((email) => {
    setEmailLinkSentTo(email);
  }, []);

  const handleResetNoticeDismiss = React.useCallback(() => {
    setResetEmailSentTo("");
  }, []);

  const handleForgotSuccess = React.useCallback((email: string) => {
    setResetEmailSentTo(email);
  }, []);

  const handleResetPasswordSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      if (newPassword !== confirmPassword) {
        event.preventDefault();
        setPasswordError(t("Passwords do not match"));
      } else {
        setPasswordError(null);
      }
    },
    [confirmPassword, newPassword, t]
  );

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

  if (resetEmailSentTo) {
    return (
      <Background>
        <BackButton onBack={onBack} config={backButtonConfig} />
        <Centered>
          <PageTitle title={t("Check your email")} />
          <EmailIcon />
          <Heading centered>{t("Check your email")}</Heading>
          <Note>
            <Trans
              defaults="We sent a password reset link to <em>{{ resetEmailSentTo }}</em>."
              values={{ resetEmailSentTo }}
              components={{ em: <em /> }}
            />
          </Note>
          <ButtonLarge onClick={handleResetNoticeDismiss} fullwidth neutral>
            {t("Back to login")}
          </ButtonLarge>
        </Centered>
      </Background>
    );
  }

  if (resetToken) {
    return (
      <Background>
        <BackButton onBack={onBack} config={backButtonConfig} />
        <Centered>
          <PageTitle title={t("Reset password")} />
          <Heading centered>{t("Choose a new password")}</Heading>
          <Form
            method="POST"
            action="/auth/password.reset.confirm"
            onSubmit={handleResetPasswordSubmit}
          >
            <input type="hidden" name={CSRF.fieldName} value={csrfToken} />
            <input type="hidden" name="token" value={resetToken} />
            <input type="hidden" name="client" value={clientType} />
            <InputLarge
              type="password"
              name="password"
              placeholder={t("New password")}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              short
            />
            <InputLarge
              type="password"
              placeholder={t("Confirm password")}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              short
            />
            {passwordError ? <ErrorText>{passwordError}</ErrorText> : null}
            <ButtonLarge type="submit" fullwidth>
              {t("Reset password")}
            </ButtonLarge>
            <ButtonLarge
              neutral
              fullwidth
              type="button"
              onClick={() => {
                handleResetNoticeDismiss();
                window.location.href = "/";
              }}
            >
              {t("Back to login")}
            </ButtonLarge>
          </Form>
        </Centered>
      </Background>
    );
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

  const firstRun =
    config.providers.length === 0 && !isCloudHosted && !config.name;
  const hasMultipleProviders = config.providers.length > 1;
  const defaultProvider = find(
    config.providers,
    (provider) => provider.id === auth.lastSignedIn && !isCreate
  );
  const preferOTP = isPWA || !!forceOTP;

  if (firstRun) {
    return (
      <React.Suspense fallback={null}>
        <WorkspaceSetup onBack={onBack} />
      </React.Suspense>
    );
  }

  if (emailLinkSentTo) {
    return (
      <Background>
        <BackButton onBack={onBack} config={config} />
        <Centered>
          <PageTitle title={t("Check your email")} />
          <EmailIcon />
          <Heading centered>{t("Check your email")}</Heading>
          {preferOTP ? (
            <>
              <Note>
                <Trans
                  defaults="Enter the sign-in code sent to the email <em>{{ emailLinkSentTo }}</em>"
                  values={{ emailLinkSentTo }}
                  components={{ em: <em /> }}
                />
                .
              </Note>
              <Form
                method="POST"
                action="/auth/email.callback"
                style={{ width: "100%" }}
              >
                <input type="hidden" name="email" value={emailLinkSentTo} />
                <input type="hidden" name="client" value={clientType} />
                <input type="hidden" name="follow" value="true" />
                <OneTimePasswordInput name="code" />
                <br />
                <ButtonLarge type="submit" fullwidth>
                  {t("Continue")}
                </ButtonLarge>
              </Form>
            </>
          ) : (
            <>
              <Note>
                <Trans
                  defaults="A magic sign-in link has been sent to the email <em>{{ emailLinkSentTo }}</em> if an account exists."
                  values={{ emailLinkSentTo }}
                  components={{ em: <em /> }}
                />
              </Note>
              <br />
            </>
          )}
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
              preferOTP={preferOTP}
              onForgotPassword={
                defaultProvider.id === "password"
                  ? () => setForgotPasswordOpen(true)
                  : undefined
              }
              onPasswordExpand={
                defaultProvider.id === "password"
                  ? () => setPasswordAuthExpanded(true)
                  : undefined
              }
              {...defaultProvider}
            />
            {hasMultipleProviders && null}
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
              preferOTP={preferOTP}
              onForgotPassword={
                provider.id === "password"
                  ? () => setForgotPasswordOpen(true)
                  : undefined
              }
              onPasswordExpand={
                provider.id === "password"
                  ? () => setPasswordAuthExpanded(true)
                  : undefined
              }
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
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onRequestClose={() => setForgotPasswordOpen(false)}
        onSuccess={handleForgotSuccess}
      />
    </Background>
  );
}

const Form = styled.form`
  margin: 1em 0;
`;

const StyledHeading = styled(Heading)`
  margin: 0;
`;

const Domain = styled.div`
  color: ${s("textSecondary")};
  padding: 0 8px 0 0;
`;

const ErrorText = styled(Text)`
  color: ${(props) => props.theme.danger};
  text-align: center;
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

export default observer(Login);
