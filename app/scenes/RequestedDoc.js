// @flow
import { computed, observable } from "mobx"
import { observer, inject } from "mobx-react";
import * as React from "react";
import { withRouter, type RouterHistory } from "react-router-dom";
import styled from "styled-components";
import User from "../models/User";

import RequestedDocsStore from "stores/RequestedDocsStore";
import FollowsStore from "../stores/FollowsStore";
import RequestedDocNew from "./RequestedDocNew"
import RequestedDocs from "../models/RequestedDocs"
import CenteredContent from "components/CenteredContent";
import Heading from "components/Heading";
import PageTitle from "components/PageTitle";
import Subheading from "components/Subheading";
import Actions, { Action } from "components/Actions";
import Button from "components/Button";
import Flex from "components/Flex";
import Input from "components/Input";
import { NewDocumentIcon } from "outline-icons";
import Modal from "components/Modal";
import List from "components/List";
import { ListPlaceholder } from "components/LoadingPlaceholder";
import Empty from "components/Empty";
import Breadcrumb from "components/BreadcrumbRequestedDoc";
import ButtonFollow from "components/ButtonFollow";
import UsersStore from "../stores/UsersStore";
import { ElasticBeanstalk } from "aws-sdk";
import AuthStore from "../stores/AuthStore";



type Props = {
    requestedDocs: RequestedDocsStore,
    auth: AuthStore,
    user: User,
    ui: UiStore,
}

@observer
class RequestedDoc extends React.Component<Props>{
    isPreloaded: boolean = !!this.props.requestedDocs.orderedData.length;

    @observable createRequestedDocModalOpen: boolean = false;

    constructor(props) {
        super(props);
        // this.state = { isFollow: false };
    }

    componentDidMount() {
        const { requestedDocs, users, follows, auth } = this.props;

        if (!requestedDocs.isFetching && !requestedDocs.isLoaded) {
            requestedDocs.fetchPage({ limit: 100 });
        }

        if (users) {
            this.props.users.fetchPage();
        }

    }

    handleCreateRequestedDocModalOpen = () => {
        this.createRequestedDocModalOpen = true;
    };

    handleCreateRequestedDocModalClose = () => {
        this.createRequestedDocModalOpen = false;
    }

    renderNoEmpty() {
        const { requestedDocs } = this.props;

        if (requestedDocs.data.size === 0) {
            return (
                <Empty>There is no document request yet.</Empty>
            )
        }
    }

    render() {
        const { requestedDocs, users, follows, auth } = this.props;
        const showLoading = requestedDocs.isFetching && !requestedDocs.orderedData.length;
        const userCurrent = auth.user && auth.user.id


        return (
            <CenteredContent>
                <PageTitle title="Requested Docs" />
                <Heading>Requested Docs</Heading>

                <List>
                    {showLoading ? (
                        <ListPlaceholder count={5} />
                    ) : (


                            <>
                                {this.renderNoEmpty()}

                                {requestedDocs.orderedData.map((requestedDoc) => (
                                    <div key={requestedDoc.id}>
                                        <h3 key={requestedDoc.id}> {requestedDoc.title}  </h3>

                                        <DivStyle>
                                            <Breadcrumb requestedDoc={requestedDoc} users={users} onlyText />

                                            <ButtonFollow requestedDoc={requestedDoc} users={users} onlyText />
                                        </DivStyle>

                                        <hr></hr>

                                    </div>
                                ))}

                                {this.allowLoadMore && (
                                    <Waypoint key={this.offset} onEnter={this.loadMoreResults} />
                                )}

                            </>

                        )}

                </List>

                <Actions align="center" justify="flex-end">

                    <Action>
                        <Button
                            icon={<NewDocumentIcon />}
                            onClick={this.handleCreateRequestedDocModalOpen}>
                            Create a request document
                        </Button>
                    </Action>

                </Actions>

                <Modal
                    title="Create a request document"
                    onRequestClose={this.handleCreateRequestedDocModalClose}
                    isOpen={this.createRequestedDocModalOpen}
                >
                    <RequestedDocNew onSubmit={this.handleCreateRequestedDocModalClose} />
                </Modal>
            </CenteredContent >
        )
    }
}

const Centered = styled.div`
  text-align: center;
`;

const TitleDoc = styled.h3`
    font-size: 1.25em;
`;

const DivStyle = styled.div`
    padding: 5px 0px;
`;



export default inject("requestedDocs", "users", "auth", "policies", "follows")(withRouter(RequestedDoc))