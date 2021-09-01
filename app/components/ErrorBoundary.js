// @flow
import * as Sentry from "@sentry/react";
import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { withTranslation, type TFunction, Trans } from "react-i18next";
import styled from "styled-components";
import Button from "components/Button";
import CenteredContent from "components/CenteredContent";
import HelpText from "components/HelpText";
import PageTitle from "components/PageTitle";
import { githubIssuesUrl } from "../../shared/utils/routeHelpers";
import env from "env";

type Props = {|
  children: React.Node,
  reloadOnChunkMissing?: boolean,
  t: TFunction,
|};

@observer
class ErrorBoundary extends React.Component<Props> {
  @observable error: ?Error;
  @observable showDetails: boolean = false;

  componentDidCatch(error: Error, info: Object) {
    this.error = error;
    console.error(error);

    if (
      this.props.reloadOnChunkMissing &&
      error.message &&
      error.message.match(/chunk/)
    ) {
      // If the editor bundle fails to load then reload the entire window. This
      // can happen if a deploy happens between the user loading the initial JS
      // bundle and the async-loaded editor JS bundle as the hash will change.
      window.location.reload(true);
      return;
    }

    if (env.SENTRY_DSN) {
      Sentry.captureException(error);
    }
  }

  handleReload = () => {
    window.location.reload(true);
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
      const isReported = !!env.SENTRY_DSN && env.DEPLOYMENT === "hosted";
      const isChunkError = this.error.message.match(/chunk/);

      if (isChunkError) {
        return (
          <CenteredContent>
            <PageTitle title={t("Module failed to load")} />
            <h1>
              <Trans>Loading Failed</Trans>
            </h1>
            <HelpText>
              <Trans>
                Sorry, part of the application failed to load. This may be
                because it was updated since you opened the tab or because of a
                failed network request. Please try reloading.
              </Trans>
            </HelpText>
            <p>
              <Button onClick={this.handleReload}>
                <Trans>Reload</Trans>
              </Button>
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
          <HelpText>
            <Trans
              defaults="Sorry, an unrecoverable error occurred{{notified}}. Please try reloading the page, it may have been a temporary glitch."
              values={{
                notified: isReported
                  ? ` – ${t("our engineers have been notified")}`
                  : undefined,
              }}
            />
          </HelpText>
          {this.showDetails && <Pre>{error.toString()}</Pre>}
          <p>
            <Button onClick={this.handleReload}>
              <Trans>Reload</Trans>
            </Button>{" "}
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

export default withTranslation()<ErrorBoundary>(ErrorBoundary);
