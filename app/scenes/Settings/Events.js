// @flow
import { observable, action } from "mobx";
import { observer, inject } from "mobx-react";
import * as React from "react";
import { type Match } from "react-router-dom";
import { Waypoint } from "react-waypoint";

import { DEFAULT_PAGINATION_LIMIT } from "stores/BaseStore";
import EventsStore from "stores/EventsStore";
import CenteredContent from "components/CenteredContent";
import HelpText from "components/HelpText";
import List from "components/List";
import { ListPlaceholder } from "components/LoadingPlaceholder";
import PageTitle from "components/PageTitle";
import Tab from "components/Tab";
import Tabs from "components/Tabs";
import EventListItem from "./components/EventListItem";

type Props = {
  events: EventsStore,
  match: Match,
};

@observer
class Events extends React.Component<Props> {
  @observable isLoaded: boolean = false;
  @observable isFetching: boolean = false;
  @observable offset: number = 0;
  @observable allowLoadMore: boolean = true;

  componentDidMount() {
    this.fetchResults();
  }

  fetchResults = async () => {
    this.isFetching = true;

    const limit = DEFAULT_PAGINATION_LIMIT;
    const results = await this.props.events.fetchPage({
      limit,
      offset: this.offset,
      auditLog: true,
    });

    if (
      results &&
      (results.length === 0 || results.length < DEFAULT_PAGINATION_LIMIT)
    ) {
      this.allowLoadMore = false;
    } else {
      this.offset += DEFAULT_PAGINATION_LIMIT;
    }

    this.isLoaded = true;
    this.isFetching = false;
  };

  @action
  loadMoreResults = async () => {
    // Don't paginate if there aren't more results or we’re in the middle of fetching
    if (!this.allowLoadMore || this.isFetching) return;
    await this.fetchResults();
  };

  render() {
    const { events } = this.props;
    const showLoading = events.isFetching && !events.orderedData.length;

    return (
      <CenteredContent>
        <PageTitle title="Audit Log" />
        <h1>Audit Log</h1>
        <HelpText>
          The audit log details the history of security related and other events
          across your knowledge base.
        </HelpText>

        <Tabs>
          <Tab to="/settings/events" exact>
            Events
          </Tab>
        </Tabs>
        <List>
          {showLoading ? (
            <ListPlaceholder count={5} />
          ) : (
            <>
              {events.orderedData.map((event) => (
                <EventListItem event={event} key={event.id} />
              ))}
              {this.allowLoadMore && (
                <Waypoint key={this.offset} onEnter={this.loadMoreResults} />
              )}
            </>
          )}
        </List>
      </CenteredContent>
    );
  }
}

export default inject("events")(Events);
