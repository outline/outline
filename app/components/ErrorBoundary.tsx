import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { withTranslation, Trans, WithTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { UrlHelper } from "@shared/utils/UrlHelper";
import Button from "~/components/Button";
import CenteredContent from "~/components/CenteredContent";
import Heading from "~/components/Heading";
import PageTitle from "~/components/PageTitle";
import Text from "~/components/Text";
import env from "~/env";
import Logger from "~/utils/Logger";
import isCloudHosted from "~/utils/isCloudHosted";
import Storage from "@shared/utils/Storage";
import { deleteAllDatabases } from "~/utils/developer";
import Flex from "./Flex";

type Props = WithTranslation & {
  /** Whether to reload the page if a chunk fails to load. */
  reloadOnChunkMissing?: boolean;
  /** Whether to show a title heading. */
  showTitle?: boolean;
  /** The wrapping component to use. */
  component?: React.ComponentType | string;
};

const ERROR_TRACKING_KEY = "error-boundary-tracking";
const ERROR_TRACKING_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

@observer
class ErrorBoundary extends React.Component<Props> {
  @observable
  error: Error | null | undefined;

  @observable
  showDetails = false;

  @observable
  isRepeatedError = false;

  componentDidMount() {
    this.checkForPreviousErrors();
  }

  componentDidCatch(error: Error) {
    this.error = error;

    if (
      this.props.reloadOnChunkMissing &&
      error.message &&
      error.message.match(/dynamically imported module/)
    ) {
      // If the editor bundle fails to load then reload the entire window. This
      // can happen if a deploy happens between the user loading the initial JS
      // bundle and the async-loaded editor JS bundle as the hash will change.
      window.location.reload();
      return;
    }

    this.trackError();
    Logger.error("ErrorBoundary", error);
  }

  private checkForPreviousErrors = () => {
    try {
      const stored = Storage.get(ERROR_TRACKING_KEY);
      if (!stored) {
        return;
      }

      const errors: number[] = JSON.parse(stored);
      const cutoff = Date.now() - ERROR_TRACKING_WINDOW_MS;
      const recentErrors = errors.filter((timestamp) => timestamp > cutoff);

      this.isRepeatedError = recentErrors.length > 0;
    } catch (err) {
      Logger.warn("Failed to parse stored errors for error boundary", { err });
    }
  };

  private trackError = () => {
    try {
      const stored = Storage.get(ERROR_TRACKING_KEY);
      const errors: number[] = stored ? JSON.parse(stored) : [];
      const cutoff = Date.now() - ERROR_TRACKING_WINDOW_MS;

      // Filter out old errors and add current one
      const updatedErrors = [
        ...errors.filter((timestamp) => timestamp > cutoff),
        Date.now(),
      ];

      Storage.set(ERROR_TRACKING_KEY, JSON.stringify(updatedErrors));

      this.isRepeatedError = updatedErrors.length > 1;
    } catch (err) {
      Logger.warn("Failed to track error in error boundary", { err });
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleShowDetails = () => {
    this.showDetails = true;
  };

  handleReportBug = () => {
    window.open(isCloudHosted ? UrlHelper.contact : UrlHelper.github);
  };

  handleClearCache = async () => {
    await deleteAllDatabases();
    Storage.clear();
    window.location.reload();
  };

  render() {
    const { t, component: Component = CenteredContent, showTitle } = this.props;

    if (this.error) {
      const error = this.error;
      const isReported = !!env.SENTRY_DSN && isCloudHosted;
      const isChunkError = [
        "module script failed",
        "dynamically imported module",
      ].some((msg) => this.error?.message?.includes(msg));

      if (isChunkError) {
        return (
          <Component>
            {showTitle && (
              <>
                <PageTitle title={t("Module failed to load")} />
                <Heading>
                  <Trans>Loading Failed</Trans>
                </Heading>
              </>
            )}
            <Text as="p" type="secondary">
              <Trans>
                Sorry, part of the application failed to load. This may be
                because it was updated since you opened the tab or because of a
                failed network request. Please try reloading.
              </Trans>
            </Text>
            <p>
              <Button onClick={this.handleReload}>{t("Reload")}</Button>
            </p>
          </Component>
        );
      }

      return (
        <Component>
          {showTitle && (
            <>
              <PageTitle title={t("Something Unexpected Happened")} />
              <Heading>
                <Trans>Something Unexpected Happened</Trans>
              </Heading>
            </>
          )}

          {this.isRepeatedError ? (
            <Text as="p" type="secondary">
              <Trans>
                An error has occurred multiple times recently. If it continues
                please try clearing the cache or using a different browser.
              </Trans>
            </Text>
          ) : (
            <Text as="p" type="secondary">
              <Trans
                defaults="Sorry, an unrecoverable error occurred{{notified}}. Please try reloading the page, it may have been a temporary glitch."
                values={{
                  notified: isReported
                    ? ` – ${t("our engineers have been notified")}`
                    : undefined,
                }}
              />
            </Text>
          )}
          {this.showDetails && <Pre>{error.stack}</Pre>}
          <Flex gap={8} wrap>
            {this.isRepeatedError && (
              <Button onClick={this.handleClearCache}>
                <Trans>Clear cache + reload</Trans>
              </Button>
            )}
            <Button onClick={this.handleReload} neutral={this.isRepeatedError}>
              {t("Reload")}
            </Button>
            {this.showDetails ? (
              <Button onClick={this.handleReportBug} neutral>
                <Trans>Report a bug</Trans>
              </Button>
            ) : (
              <Button onClick={this.handleShowDetails} neutral>
                <Trans>Show detail</Trans>…
              </Button>
            )}
          </Flex>
        </Component>
      );
    }

    return this.props.children;
  }
}

const Pre = styled.pre`
  background: ${s("backgroundSecondary")};
  padding: 16px;
  border-radius: 4px;
  font-size: 12px;
  white-space: pre-wrap;
`;

export default withTranslation()(ErrorBoundary);
