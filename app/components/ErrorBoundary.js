// @flow
import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import Button from "components/Button";
import CenteredContent from "components/CenteredContent";
import HelpText from "components/HelpText";
import PageTitle from "components/PageTitle";
import { githubIssuesUrl } from "../../shared/utils/routeHelpers";
import env from "env";

type Props = {
  children: React.Node,
  reloadOnChunkMissing?: boolean,
};

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

    if (window.Sentry) {
      window.Sentry.captureException(error);
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
    if (this.error) {
      const error = this.error;
      const isReported = !!window.Sentry && env.DEPLOYMENT === "hosted";
      const isChunkError = this.error.message.match(/chunk/);

      if (isChunkError) {
        return (
          <CenteredContent>
            <PageTitle title="Module failed to load" />
            <h1>Loading Failed</h1>
            <HelpText>
              Sorry, part of the application failed to load. This may be because
              it was updated since you opened the tab or because of a failed
              network request. Please try reloading.
            </HelpText>
            <p>
              <Button onClick={this.handleReload}>Reload</Button>
            </p>
          </CenteredContent>
        );
      }

      return (
        <CenteredContent>
          <PageTitle title="Something Unexpected Happened" />
          <h1>Something Unexpected Happened</h1>
          <HelpText>
            Sorry, an unrecoverable error occurred
            {isReported && " – our engineers have been notified"}. Please try
            reloading the page, it may have been a temporary glitch.
          </HelpText>
          {this.showDetails && <Pre>{error.toString()}</Pre>}
          <p>
            <Button onClick={this.handleReload}>Reload</Button>{" "}
            {this.showDetails ? (
              <Button onClick={this.handleReportBug} neutral>
                Report a Bug…
              </Button>
            ) : (
              <Button onClick={this.handleShowDetails} neutral>
                Show Details…
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
  background: ${(props) => props.theme.smoke};
  padding: 16px;
  border-radius: 4px;
  font-size: 12px;
  white-space: pre-wrap;
`;

export default ErrorBoundary;
