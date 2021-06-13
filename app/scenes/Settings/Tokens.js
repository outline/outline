// @flow
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import { CodeIcon } from "outline-icons";
import * as React from "react";
import ApiKeysStore from "stores/ApiKeysStore";
import UiStore from "stores/UiStore";
import Button from "components/Button";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import Input from "components/Input";
import List from "components/List";
import Scene from "components/Scene";
import TokenListItem from "./components/TokenListItem";

type Props = {
  apiKeys: ApiKeysStore,
  ui: UiStore,
};

@observer
class Tokens extends React.Component<Props> {
  @observable name: string = "";

  componentDidMount() {
    this.props.apiKeys.fetchPage({ limit: 100 });
  }

  handleUpdate = (ev: SyntheticInputEvent<*>) => {
    this.name = ev.target.value;
  };

  handleSubmit = async (ev: SyntheticEvent<>) => {
    try {
      ev.preventDefault();
      await this.props.apiKeys.create({ name: this.name });
      this.name = "";
    } catch (error) {
      this.props.ui.showToast(error.message, { type: "error" });
    }
  };

  render() {
    const { apiKeys } = this.props;
    const hasApiKeys = apiKeys.orderedData.length > 0;

    return (
      <Scene title="API Tokens" icon={<CodeIcon color="currentColor" />}>
        <Heading>API Tokens</Heading>
        <HelpText>
          You can create an unlimited amount of personal tokens to authenticate
          with the API. For more details about the API take a look at the{" "}
          <a href="https://www.getoutline.com/developers">
            developer documentation
          </a>
          .
        </HelpText>

        {hasApiKeys && (
          <List>
            {apiKeys.orderedData.map((token) => (
              <TokenListItem
                key={token.id}
                token={token}
                onDelete={token.delete}
              />
            ))}
          </List>
        )}

        <form onSubmit={this.handleSubmit}>
          <Input
            onChange={this.handleUpdate}
            placeholder="Token label (eg. development)"
            value={this.name}
            required
          />
          <Button
            type="submit"
            value="Create Token"
            disabled={apiKeys.isSaving}
          />
        </form>
      </Scene>
    );
  }
}

export default inject("apiKeys", "ui")(Tokens);
