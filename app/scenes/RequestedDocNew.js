// @flow
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import { withRouter } from "react-router-dom";
import Button from "components/Button";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import Input from "components/Input";
import RequestedDocsStore from "../stores/RequestedDocsStore";
import UiStore from "../stores/UiStore";
import RequestedDoc from "../models/RequestedDocs";

type Props = {
    requestedDocs: RequestedDocsStore,
    ui: UiStore,
    onSubmit: () => void,
};

@observer
class RequestedDocNew extends React.Component<Props> {

    @observable title: string = "";
    @observable collectionId: string = "";
    @observable isSaving: boolean;

    handleSubmit = async (ev: SyntheticEvent<>) => {
        ev.preventDefault();
        this.isSaving = true;

        const requestedDoc = new RequestedDoc(
            {
                title: this.title,
                collectionId: this.collection,
            },
            this.props.requestedDocs,

        );

        try {
            await requestedDoc.save();
            this.props.onSubmit();
        } catch (err) {
            this.props.ui.showToast(err.message);
        } finally {
            this.isSaving = false;
        }
    };

    handleTitleChange = (ev: SyntheticInputEvent<*>) => {
        this.title = ev.target.value;
    };

    handleCollectionChange = (ev: SyntheticInputEvent<*>) => {
        this.collection = ev.target.value;
    };

    render() {
        const { collections } = this.props;

        return (
            <form onSubmit={this.handleSubmit}>
                <HelpText>
                    Request documents
                </HelpText>
                <Flex>
                    <Input
                        type="text"
                        label="Title"
                        onChange={this.handleTitleChange}
                        value={this.title}
                        required
                        autoFocus
                        flex
                    />
                </Flex>

                <Flex>
                    <Select defaultValue={'DEFAULT'} onChange={this.handleCollectionChange}>
                        <option value="DEFAULT" disabled>Select a collection ...</option>
                        {collections.orderedData.map((collection) => (
                            <option selected key={collection.id} value={collection.id}> {collection.name} </option>
                        ))}
                    </Select>
                </Flex>

                <Button type="submit" disabled={this.isSaving || !this.title}>
                    {this.isSaving ? "Creating…" : "Create"}
                </Button>
            </form >
        );
    }
};
const Select = styled.select`
    margin-bottom: 15px;
    width: 100%;
    -webkit-flex: 1;
    -ms-flex: 1;
    flex: 1;
    padding: 8px 10px 8px 10px;
    outline: none;
    background: none;
    color: #111319;
    border-width: 1px;
    border-style: solid;
    border-color: #DAE1E9;
    border-radius: 4px;
`;



export default inject("requestedDocs", "ui", "collections")(withRouter(RequestedDocNew));