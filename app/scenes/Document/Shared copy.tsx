import { Location } from "history";
import { observer } from "mobx-react";
import { MenuIcon } from "outline-icons";
import * as React from "react";
import { RouteComponentProps } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import DocumentModel from "~/models/Document";
import Error404 from "~/scenes/Error404";
import ErrorOffline from "~/scenes/ErrorOffline";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Sidebar from "~/components/Sidebar/Shared";
import useStores from "~/hooks/useStores";
import { NavigationNode } from "~/types";
import { OfflineError } from "~/utils/errors";
import Document from "./components/Document";
import Loading from "./components/Loading";

const EMPTY_OBJECT = {};

type Props = RouteComponentProps<{
  shareId: string;
  documentSlug: string;
}> & {
  location: Location<{ title?: string }>;
};

function SharedDocumentScene(props: Props) {
  const { ui } = useStores();

  const theme = useTheme();
  const [response, setResponse] = React.useState<{
    document: DocumentModel;
    sharedTree?: NavigationNode | undefined;
  }>();
  const [error, setError] = React.useState<Error | null | undefined>();
  const { documents } = useStores();
  const { shareId, documentSlug } = props.match.params;

  const sidebarCollapsed = ui.sidebarCollapsed || !response?.sharedTree;

  // ensure the wider page color always matches the theme
  React.useEffect(() => {
    window.document.body.style.background = theme.background;
  }, [theme]);

  React.useEffect(() => {
    async function fetchData() {
      try {
        const response = await documents.fetchWithSharedTree(documentSlug, {
          shareId,
        });
        setResponse(response);
        ui.setActiveDocument(response.document);
      } catch (err) {
        setError(err);
      }
    }
    fetchData();
  }, [documents, documentSlug, shareId, ui]);

  if (error) {
    return error instanceof OfflineError ? <ErrorOffline /> : <Error404 />;
  }

  if (!response) {
    return <Loading location={props.location} />;
  }

  return (
    <Container auto>
      <MobileMenuButton
        onClick={ui.toggleMobileSidebar}
        icon={<MenuIcon />}
        iconColor="currentColor"
        neutral
      />

      {response.sharedTree && (
        <Sidebar rootNode={response.sharedTree} shareId={shareId} />
      )}
      <Content
        auto
        justify="center"
        $isResizing={ui.sidebarIsResizing}
        $sidebarCollapsed={sidebarCollapsed}
        style={
          sidebarCollapsed
            ? undefined
            : {
                marginLeft: `${ui.sidebarWidth}px`,
              }
        }
      >
        <Document
          abilities={EMPTY_OBJECT}
          document={response.document}
          sharedTree={response.sharedTree}
          shareId={shareId}
          readOnly
        />
      </Content>
    </Container>
  );
}

// XXX this is copy paste and should be factored out into its own thing, along with the usage in layout
const Container = styled(Flex)`
  background: ${(props) => props.theme.background};
  transition: ${(props) => props.theme.backgroundTransition};
  position: relative;
  width: 100%;
  min-height: 100%;
`;

const MobileMenuButton = styled(Button)`
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: ${(props) => props.theme.depths.sidebar - 1};

  ${breakpoint("tablet")`
    display: none;
  `};

  @media print {
    display: none;
  }
`;

const Content = styled(Flex)<{
  $isResizing?: boolean;
  $sidebarCollapsed?: boolean;
}>`
  margin: 0;
  transition: ${(props) =>
    props.$isResizing ? "none" : `margin-left 100ms ease-out`};

  @media print {
    margin: 0 !important;
  }

  ${breakpoint("mobile", "tablet")`
    margin-left: 0 !important;
  `}

  ${breakpoint("tablet")`
    ${(props: any) =>
      props.$sidebarCollapsed &&
      `margin-left: ${props.theme.sidebarCollapsedWidth}px;`}
  `};
`;

export default observer(SharedDocumentScene);
