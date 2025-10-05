import { observer } from "mobx-react";
import { useEffect, useState } from "react";
import { RouteComponentProps } from "react-router-dom";
import styled from "styled-components";
import FullscreenLoading from "~/components/FullscreenLoading";
import useStores from "~/hooks/useStores";
import useQuery from "~/hooks/useQuery";
import Document from "~/models/Document";
import Error404 from "~/scenes/Errors/Error404";
import ExcalidrawComponent from "~/editor/excalidraw/components/Excalidraw";

type Params = {
  id: string;
};

type Props = RouteComponentProps<Params>;

function ExcalidrawViewer(props: Props) {
  const { id } = props.match.params;
  const query = useQuery();
  const documentId = query.get("documentId");
  const mode = query.get("mode") || "view";
  const { documents, auth, ui } = useStores();
  const [document, setDocument] = useState<Document | null | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!documentId) {
      setDocument(null);
      setIsLoading(false);
      return;
    }

    const loadDocument = async () => {
      try {
        const doc = await documents.fetch(documentId);
        setDocument(doc);
      } catch (error) {
        console.error("Failed to load document:", error);
        setDocument(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [documentId, documents]);

  // Show loading state
  if (isLoading) {
    return (
      <Container>
        <FullscreenLoading />
      </Container>
    );
  }

  // Show 404 if document not found or no documentId provided
  if (!document || !documentId) {
    return <Error404 />;
  }

  const isViewMode = mode === "view";
  const isEditable = !isViewMode;

  return (
    <Container>
      <ExcalidrawComponent
        node={{
          attrs: { id, alt: null },
        } as any}
        isSelected={false}
        isEditable={isEditable}
        getPos={() => 0}
        onEdit={() => {}}
        documentId={documentId}
        collaborationToken={auth.collaborationToken || undefined}
        user={auth.user ? { name: auth.user.name, id: auth.user.id } : undefined}
        theme={ui.resolvedTheme}
      />
    </Container>
  );
}

const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background: ${(props) => props.theme.background};
  z-index: 1000;
  overflow: hidden;

  /* Ensure Excalidraw fills the container */
  > div {
    height: 100%;
    width: 100%;
  }
`;

export default observer(ExcalidrawViewer);
