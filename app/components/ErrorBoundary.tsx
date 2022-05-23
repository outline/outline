import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { withTranslation, Trans, WithTranslation } from "react-i18next";
import styled from "styled-components";
import { githubIssuesUrl } from "@shared/utils/urlHelpers";
import Button from "~/components/Button";
import CenteredContent from "~/components/CenteredContent";
import PageTitle from "~/components/PageTitle";
import Text from "~/components/Text";
import env from "~/env";
import Logger from "~/utils/Logger";
import isCloudHosted from "~/utils/isCloudHosted";

type Props = WithTranslation & {
  reloadOnChunkMissing?: boolean;
};

@observer
class ErrorBoundary extends React.Component<Props> {
  @observable
  error: Error | null | undefined;

  @observable
  showDetails = false;

  componentDidCatch(error: Error) {
    this.error = error;

    if (
      this.props.reloadOnChunkMissing &&
      error.message &&
      error.message.match(/chunk/)
    ) {
      // If the editor bundle fails to load then reload the entire window. This
      // can happen if a deploy happens between the user loading the initial JS
      // bundle and the async-loaded editor JS bundle as the hash will change.
      window.location.reload();
      return;
    }

    Logger.error("ErrorBoundary", error);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleShowDetails = () => {
    this.showDetails = true;
  };

  handleReportBug = () => {
    window.open(githubIssuesUrl());
  };

  render() {
    const { t } = this.props;

    if (this.error) {
      const error = this.error;
      const isReported = !!env.SENTRY_DSN && isCloudHosted;
      const isChunkError = this.error.message.match(/chunk/);

      if (isChunkError) {
        return (
          <CenteredContent>
            <PageTitle title={t("Module failed to load")} />
            <h1>
              <Trans>Loading Failed</Trans>
            </h1>
            <Text type="secondary">
              <Trans>
                Sorry, part of the application failed to load. This may be
                because it was updated since you opened the tab or because of a
                failed network request. Please try reloading.
              </Trans>
            </Text>
            <p>
              <Button onClick={this.handleReload}>{t("Reload")}</Button>
            </p>
          </CenteredContent>
        );
      }

      return (
        <CenteredContent>
          <PageTitle title={t("Something Unexpected Happened")} />
          <h1>
            <Trans>Something Unexpected Happened</Trans>
          </h1>
          <Text type="secondary">
            <Trans
              defaults="Sorry, an unrecoverable error occurred{{notified}}. Please try reloading the page, it may have been a temporary glitch."
              values={{
                notified: isReported
                  ? ` – ${t("our engineers have been notified")}`
                  : undefined,
              }}
            />
          </Text>
          {this.showDetails && <Pre>{error.toString()}</Pre>}
          <p>
            <Button onClick={this.handleReload}>{t("Reload")}</Button>{" "}
            {this.showDetails ? (
              <Button onClick={this.handleReportBug} neutral>
                <Trans>Report a Bug</Trans>…
              </Button>
            ) : (
              <Button onClick={this.handleShowDetails} neutral>
                <Trans>Show Detail</Trans>…
              </Button>
            )}
          </p>
        </CenteredContent>
      );
    }

    return this.props.children;
  }
}

const Pre = styled.pre`
  background: ${(props) => props.theme.secondaryBackground};
  padding: 16px;
  border-radius: 4px;
  font-size: 12px;
  white-space: pre-wrap;
`;

export default withTranslation()(ErrorBoundary);
