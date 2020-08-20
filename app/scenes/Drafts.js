// @flow
import { debounce } from "lodash";
import { observable, action } from "mobx";
import { inject, observer } from "mobx-react";
import queryString from "query-string";
import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import DocumentsStore from "stores/DocumentsStore";
import Document from "models/Document";
import CollectionFilter from "scenes/Search/components/CollectionFilter";
import DateFilter from "scenes/Search/components/DateFilter";
import UserFilter from "scenes/Search/components/UserFilter";

import Actions, { Action } from "components/Actions";
import CenteredContent from "components/CenteredContent";
import Empty from "components/Empty";
import Flex from "components/Flex";
import Heading from "components/Heading";
import InputSearch from "components/InputSearch";
import LoadingIndicator from "components/LoadingIndicator";
import PageTitle from "components/PageTitle";
import PaginatedDocumentList from "components/PaginatedDocumentList";
import Subheading from "components/Subheading";
import NewDocumentMenu from "menus/NewDocumentMenu";

type Props = {
  documents: DocumentsStore,
};

@observer
class Drafts extends React.Component<Props> {
  @observable params: URLSearchParams = new URLSearchParams();
  @observable isFetching: boolean = false;
  @observable drafts: Document[] = [];

  componentDidMount() {
    this.handleQueryChange();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.location.search !== this.props.location.search) {
      this.handleQueryChange();
    }
  }

  handleQueryChange = () => {
    this.params = new URLSearchParams(this.props.location.search);
    this.fetchResultsDebounced();
  };

  handleFilterChange = (search) => {
    this.props.history.replace({
      pathname: this.props.location.pathname,
      search: queryString.stringify({
        ...queryString.parse(this.props.location.search),
        ...search,
      }),
    });

    this.fetchResultsDebounced();
  };

  @action
  fetchResults = async () => {
    this.isFetching = true;

    try {
      const result = await this.props.documents.fetchDrafts({
        dateFilter: this.dateFilter,
        collectionId: this.collectionId,
        userId: this.userId,
      });

      this.drafts = result.map(
        (item) => new Document(item, this.props.documents)
      );
    } finally {
      this.isFetching = false;
    }
  };

  fetchResultsDebounced = debounce(this.fetchResults, 350, {
    leading: false,
    trailing: true,
  });

  get collectionId() {
    const id = this.params.get("collectionId");
    return id ? id : undefined;
  }

  get userId() {
    const id = this.params.get("userId");
    return id ? id : undefined;
  }

  get dateFilter() {
    const id = this.params.get("dateFilter");
    return id ? id : undefined;
  }

  render() {
    const { fetchDrafts } = this.props.documents;

    return (
      <CenteredContent column auto>
        <PageTitle title="Drafts" />
        <Heading>Drafts</Heading>
        <Filters>
          <CollectionFilter
            collectionId={this.collectionId}
            onSelect={(collectionId) =>
              this.handleFilterChange({ collectionId })
            }
          />
          <UserFilter
            userId={this.userId}
            onSelect={(userId) => this.handleFilterChange({ userId })}
          />
          <DateFilter
            dateFilter={this.dateFilter}
            onSelect={(dateFilter) => this.handleFilterChange({ dateFilter })}
          />
        </Filters>
        {this.isFetching ? (
          <LoadingIndicator />
        ) : (
          <PaginatedDocumentList
            heading={<Subheading>Documents</Subheading>}
            empty={<Empty>You’ve not got any drafts at the moment.</Empty>}
            fetch={fetchDrafts}
            documents={this.drafts}
            options={{
              dateFilter: this.dateFilter,
              collectionId: this.collectionId,
              userId: this.userId,
            }}
            showCollection
          />
        )}

        <Actions align="center" justify="flex-end">
          <Action>
            <InputSearch />
          </Action>
          <Action>
            <NewDocumentMenu />
          </Action>
        </Actions>
      </CenteredContent>
    );
  }
}

const Filters = styled(Flex)`
  opacity: 0.85;
  transition: opacity 100ms ease-in-out;
  padding: 8px 0;

  ${breakpoint("tablet")`	
    padding: 0;
  `};

  &:hover {
    opacity: 1;
  }
`;

export default inject("documents")(Drafts);
