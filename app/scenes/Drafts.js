// @flow
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import queryString from "query-string";
import * as React from "react";
import { withTranslation, type TFunction } from "react-i18next";
import { type RouterHistory } from "react-router-dom";
import styled from "styled-components";
import DocumentsStore from "stores/DocumentsStore";
import CollectionFilter from "scenes/Search/components/CollectionFilter";
import DateFilter from "scenes/Search/components/DateFilter";

import Actions, { Action } from "components/Actions";
import CenteredContent from "components/CenteredContent";
import Empty from "components/Empty";
import Flex from "components/Flex";
import Heading from "components/Heading";
import InputSearch from "components/InputSearch";
import PageTitle from "components/PageTitle";
import PaginatedDocumentList from "components/PaginatedDocumentList";
import Subheading from "components/Subheading";
import NewDocumentMenu from "menus/NewDocumentMenu";
import { type LocationWithState } from "types";

type Props = {|
  documents: DocumentsStore,
  history: RouterHistory,
  location: LocationWithState,
  t: TFunction,
|};

@observer
class Drafts extends React.Component<Props> {
  @observable params: URLSearchParams = new URLSearchParams(
    this.props.location.search
  );

  componentDidUpdate(prevProps: Props) {
    if (prevProps.location.search !== this.props.location.search) {
      this.handleQueryChange();
    }
  }

  handleQueryChange = () => {
    this.params = new URLSearchParams(this.props.location.search);
  };

  handleFilterChange = (search: {
    dateFilter?: ?string,
    collectionId?: ?string,
  }) => {
    this.props.history.replace({
      pathname: this.props.location.pathname,
      search: queryString.stringify({
        ...queryString.parse(this.props.location.search),
        ...search,
      }),
    });
  };

  get collectionId() {
    const id = this.params.get("collectionId");
    return id ? id : undefined;
  }

  get dateFilter() {
    const id = this.params.get("dateFilter");
    return id ? id : undefined;
  }

  render() {
    const { t } = this.props;
    const { drafts, fetchDrafts } = this.props.documents;
    const isFiltered = this.collectionId || this.dateFilter;
    const options = {
      dateFilter: this.dateFilter,
      collectionId: this.collectionId,
    };

    return (
      <CenteredContent column auto>
        <PageTitle title={t("Drafts")} />
        <Heading>{t("Drafts")}</Heading>
        <Subheading>
          {t("Documents")}
          <Filters>
            <CollectionFilter
              collectionId={this.collectionId}
              onSelect={(collectionId) =>
                this.handleFilterChange({ collectionId })
              }
            />
            <DateFilter
              dateFilter={this.dateFilter}
              onSelect={(dateFilter) => this.handleFilterChange({ dateFilter })}
            />
          </Filters>
        </Subheading>

        <PaginatedDocumentList
          empty={
            <Empty>
              {isFiltered
                ? t("No documents found for your filters.")
                : t("You’ve not got any drafts at the moment.")}
            </Empty>
          }
          fetch={fetchDrafts}
          documents={drafts(options)}
          options={options}
          showCollection
        />

        <Actions align="center" justify="flex-end">
          <Action>
            <InputSearch source="drafts" />
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
  position: absolute;
  right: -8px;
  bottom: 0;
  padding: 0 0 6px;

  &:hover {
    opacity: 1;
  }
`;

export default withTranslation()<Drafts>(inject("documents")(Drafts));
