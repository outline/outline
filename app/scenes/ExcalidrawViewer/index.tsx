import { observer } from "mobx-react";
import { useEffect, useState, useCallback } from "react";
import { RouteComponentProps } from "react-router-dom";
import styled from "styled-components";
import FullscreenLoading from "~/components/FullscreenLoading";
import useStores from "~/hooks/useStores";
import useQuery from "~/hooks/useQuery";
import Document from "~/models/Document";
import Error404 from "~/scenes/Errors/Error404";
import ExcalidrawIframe from "~/editor/excalidraw/components/ExcalidrawIframe";

type Params = {
  id: string;
};

type Props = RouteComponentProps<Params>;

function ExcalidrawViewer(props: Props) {
  const { id } = props.match.params;
  const query = useQuery();
  const documentId = query.get("documentId");
  const position = parseInt(query.get("position") || "0", 10);
  const mode = query.get("mode") || "view";
  const { documents, auth, ui } = useStores();
  const [document, setDocument] = useState<Document | null | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = useState(true);
  const [initialSvg, setInitialSvg] = useState<string>("");

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

  // Send ready message to parent when mounted
  useEffect(() => {
    if (window.parent !== window) {
      window.parent.postMessage(
        {
          type: "excalidraw:ready",
        },
        window.location.origin
      );
    }
  }, []);

  // Listen for init message from parent
  const handleMessage = useCallback((event: MessageEvent) => {
    // Validate origin
    if (event.origin !== window.location.origin) {
      return;
    }

    const { type, data } = event.data;

    if (type === "excalidraw:init" && data) {
      setInitialSvg(data.svg || "");
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [handleMessage]);

  // Handle save from ExcalidrawIframe
  const handleSave = useCallback((svg: string, height?: number) => {
    if (window.parent !== window) {
      window.parent.postMessage(
        {
          type: "excalidraw:save",
          data: {
            svg,
            height,
          },
        },
        window.location.origin
      );
    }
  }, []);

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
      <ExcalidrawIframe
        svg={initialSvg}
        documentId={documentId || ""}
        position={position}
        user={auth.user ? { name: auth.user.name, id: auth.user.id } : undefined}
        collaborationToken={auth.collaborationToken || undefined}
        theme={ui.resolvedTheme as "light" | "dark"}
        onSave={handleSave}
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
