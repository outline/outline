// @flow
import * as React from "react";
import { inject } from "mobx-react";
import type { RouterHistory, Location } from "react-router-dom";
import Flex from "components/Flex";
import CenteredContent from "components/CenteredContent";
import LoadingPlaceholder from "components/LoadingPlaceholder";
import DocumentsStore from "stores/DocumentsStore";
import UiStore from "stores/UiStore";
import { documentEditUrl } from "utils/routeHelpers";

type Props = {
  history: RouterHistory,
  location: Location,
  documents: DocumentsStore,
  ui: UiStore,
  match: Object,
};

class TemplateNew extends React.Component<Props> {
  async componentDidMount() {
    try {
      const document = await this.props.documents.create({
        template: true,
        title: "",
        text: "",
      });
      this.props.history.replace(documentEditUrl(document));
    } catch (err) {
      this.props.ui.showToast("Couldn’t create the template, try again?");
      this.props.history.goBack();
    }
  }

  render() {
    return (
      <Flex column auto>
        <CenteredContent>
          <LoadingPlaceholder />
        </CenteredContent>
      </Flex>
    );
  }
}

export default inject("documents", "ui")(TemplateNew);
