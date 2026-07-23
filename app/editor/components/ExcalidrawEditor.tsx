import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import styled, { useTheme } from "styled-components";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { depths, s } from "@shared/styles";

import {
  ExcalidrawOpenEvent,
  type ExcalidrawOpenPayload,
} from "@shared/editor/extensions/Excalidraw";
import FileHelper from "@shared/editor/lib/FileHelper";
import { svgFileToScene } from "@shared/editor/lib/ExcalidrawScene";
import type { ExcalidrawScene } from "@shared/editor/lib/ExcalidrawScene";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import LoadingIndicator from "~/components/LoadingIndicator";
import type { Editor } from "~/editor";
import useCurrentUser from "~/hooks/useCurrentUser";

window.EXCALIDRAW_ASSET_PATH = "/static/excalidraw/";

type Props = {
  /** The editor instance whose event bus we listen to. */
  editor: Editor;
};

type ExcalidrawApi = {
  getSceneElements: () => ExcalidrawScene["elements"];
  getAppState: () => ExcalidrawScene["appState"];
  getFiles: () => ExcalidrawScene["files"];
};

/**
 * Lazily-loaded Excalidraw React component. Kept in a separate chunk so the
 * heavy @excalidraw/excalidraw package (and its CSS) is only fetched when a
 * user actually opens the editor.
 */
const LazyExcalidraw = React.lazy(async () => {
  const mod = await import("@excalidraw/excalidraw");
  // Excalidraw ships its own stylesheet that must be present for the canvas UI.
  await import("@excalidraw/excalidraw/index.css");
  return { default: mod.Excalidraw };
});

/**
 * Hosts the Excalidraw editor in a full-screen modal. Listens on the editor's
 * event bus for `excalidraw:open` events emitted by the Excalidraw extension,
 * loads the existing scene (if any) from the node's SVG, and persists the
 * result back to the document on save.
 */
function ExcalidrawEditor({ editor }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const [payload, setPayload] = React.useState<ExcalidrawOpenPayload | null>(
    null
  );
  const [initialData, setInitialData] = React.useState<ExcalidrawScene | null>(
    null
  );
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const apiRef = React.useRef<ExcalidrawApi | null>(null);

  React.useEffect(() => {
    const handleOpen = async (data: unknown) => {
      const openPayload = data as ExcalidrawOpenPayload;
      setPayload(openPayload);
      setInitialData(null);
      apiRef.current = null;

      if (openPayload.src) {
        setLoading(true);
        try {
          const file = await FileHelper.getFileForUrl(openPayload.src);
          const scene = await svgFileToScene(file);
          setInitialData({
            elements: scene.elements,
            appState: scene.appState,
            files: scene.files,
          });
        } catch {
          setPayload(null);
          setInitialData(null);
          toast.error(t("Something went wrong"));
        } finally {
          setLoading(false);
        }
      } else {
        setInitialData({ elements: [], appState: {}, files: {} });
      }
    };

    editor.events.on(ExcalidrawOpenEvent, handleOpen);
    return () => editor.events.off(ExcalidrawOpenEvent, handleOpen);
  }, [editor, t]);

  const close = React.useCallback(() => {
    setPayload(null);
    setInitialData(null);
    apiRef.current = null;
    editor.view.focus();
  }, [editor]);

  const handleSave = React.useCallback(async () => {
    if (!payload || !apiRef.current) {
      close();
      return;
    }
    setSaving(true);
    try {
      const api = apiRef.current;
      await payload.onSave({
        elements: api.getSceneElements(),
        appState: api.getAppState(),
        files: api.getFiles(),
      });
      close();
    } finally {
      setSaving(false);
    }
  }, [payload, close]);

  const isOpen = payload !== null;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          close();
        }
      }}
    >
      <Dialog.Portal>
        <StyledOverlay />
        <StyledContent
          onEscapeKeyDown={close}
          onInteractOutside={(e) => e.preventDefault()}
          aria-describedby={undefined}
        >
          <Dialog.Title asChild>
            <Header align="center" justify="space-between">
              <Title>{t("Edit diagram")}</Title>
              <Flex gap={8}>
                <Button neutral onClick={close} disabled={saving}>
                  {t("Cancel")}
                </Button>
                <Button onClick={handleSave} disabled={saving || loading}>
                  {saving ? t("Saving") : t("Save")}
                </Button>
              </Flex>
            </Header>
          </Dialog.Title>
          <Canvas>
            {isOpen && !loading && initialData ? (
              <React.Suspense fallback={<LoadingIndicator />}>
                <LazyExcalidraw
                  theme={theme.isDark ? "dark" : "light"}
                  langCode={user?.language ?? undefined}
                  initialData={initialData}
                  excalidrawAPI={(api) => {
                    apiRef.current = api;
                  }}
                />
              </React.Suspense>
            ) : (
              <LoadingIndicator />
            )}
          </Canvas>
        </StyledContent>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const StyledOverlay = styled(Dialog.Overlay)`
  position: fixed;
  inset: 0;
  background-color: ${s("backdrop")};
  z-index: ${depths.overlay};
`;

const StyledContent = styled(Dialog.Content)`
  position: fixed;
  inset: 24px;
  display: flex;
  flex-direction: column;
  background: ${s("background")};
  border-radius: 8px;
  overflow: hidden;
  z-index: ${depths.modal};

  @media (max-width: 600px) {
    inset: 0;
    border-radius: 0;
  }
`;

const Header = styled(Flex)`
  padding: 12px 16px;
  border-bottom: 1px solid ${s("divider")};
`;

const Title = styled.span`
  font-size: 16px;
  font-weight: 500;
`;

const Canvas = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;

  .excalidraw {
    height: 100%;
  }
`;

export default ExcalidrawEditor;
