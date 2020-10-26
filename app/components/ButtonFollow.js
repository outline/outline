// @flow
import { observer, inject } from "mobx-react";
import {
    CollectionIcon
} from "outline-icons";
import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";

import AuthStore from "../stores/AuthStore";
import Flex from "components/Flex";
import Button from "components/Button";
import { collectionUrl } from "utils/routeHelpers";
import RequestedDocsStore from "stores/RequestedDocsStore";
import FollowsStore from "stores/FollowsStore";

type Props = {
    follows: FollowsStore,
    requestedDocs: RequestedDocsStore,
    onlyText: boolean,
    auth: AuthStore,
};


@observer
class ButtonFollow extends React.Component<Props>{

    constructor(props) {
        super(props);
        this.handleFollow = this.handleFollow.bind(this);
        this.handleUnFollow = this.handleUnFollow.bind(this);
        this.state = { isFollow: true };
    }

    componentDidMount() {
        this.props.follows.fetchPage({ requestedDocId: this.props.requestedDoc.id });
    }

    handleFollow = (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState(state => ({
            isFollow: !state.isFollow
        }));
        this.props.requestedDocs.follow(id);
    };

    handleUnFollow = (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState(state => ({
            isFollow: !state.isFollow
        }));
        this.props.requestedDocs.unfollow(id);
    };

    renderFollows() {
        const { requestedDoc, users, follows, auth } = this.props;
        const requesteDocFollows = follows.listFollow(requestedDoc.id);
        const isFollow = this.state.isFollow;
        const userCurrent = auth.user && auth.user.id

        if (requesteDocFollows.length === 0) {

            return (
                <div>
                    {this.state.isFollow ?
                        <Button onClick={(e) => this.handleFollow(e, requestedDoc.id)} >Folow </Button>
                        :
                        <Button onClick={(e) => this.handleUnFollow(e, requestedDoc.id)}> Following  </Button>
                    }
                </div>
            );


        } else if (requesteDocFollows) {

            const userFollow = requesteDocFollows.find(follow => follow.userId === userCurrent);
            if (userFollow) {

                return (

                    <div>
                        {this.state.isFollow ?
                            <Button onClick={(e) => this.handleUnFollow(e, requestedDoc.id)}> Following {requesteDocFollows.length}  </Button>
                            :
                            <Button onClick={(e) => this.handleFollow(e, requestedDoc.id)} >Folow {requesteDocFollows.length}</Button>
                        }
                    </div>

                )
            } else {
                return (
                    <div>
                        {this.state.isFollow ?
                            <Button onClick={(e) => this.handleFollow(e, requestedDoc.id)} >Folow  {requesteDocFollows.length}</Button>
                            :
                            <Button onClick={(e) => this.handleUnFollow(e, requestedDoc.id)}>Following  {requesteDocFollows.length}</Button>
                        }
                    </div>
                )
            }

        }
    }


    render() {
        return (
            <Actions>
                {this.renderFollows()}
            </Actions>
        );
    }
};


const Wrapper = styled(Flex)`
  display: none;

  ${breakpoint("tablet")`   
    display: flex;
  `};
`;

const CollectionName = styled(Link)`
  display: flex;
  flex-shrink: 0;
  color: ${(props) => props.theme.text};
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
`;

const Actions = styled(Flex)`
  margin-left: 4px;
  align-items: center;
  margin-top: 5px;
`;

export default inject("requestedDocs", "collections", "auth", "users", "follows")(ButtonFollow);
