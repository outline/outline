import { t } from "i18next";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import Flex from "~/components/Flex";
import Desktop from "~/utils/Desktop";

type DownloadedFile = {
  /** The user facing name of the downloaded file. */
  fileName: string;
  /** The absolute path the file was saved to. */
  filePath: string;
};

/**
 * Displays a toast notifying that a file finished downloading, with actions to
 * open the file or reveal it in the file manager. Desktop app only.
 *
 * @param file the name and path of the downloaded file.
 */
export function showDownloadToast(file: DownloadedFile) {
  const toastId = `download-${file.filePath}`;

  toast.success(t("Download complete"), {
    id: toastId,
    description: file.fileName,
    action: <DownloadToastActions file={file} toastId={toastId} />,
  });
}

function DownloadToastActions({
  file,
  toastId,
}: {
  file: DownloadedFile;
  toastId: string;
}) {
  const { t } = useTranslation();

  const handleOpen = useCallback(() => {
    toast.dismiss(toastId);
    void Desktop.bridge?.openDownload?.(file.filePath);
  }, [file.filePath, toastId]);

  const handleShowInFolder = useCallback(() => {
    toast.dismiss(toastId);
    void Desktop.bridge?.showDownloadInFolder?.(file.filePath);
  }, [file.filePath, toastId]);

  // The name given to the file manager differs by operating system.
  const showInFolderLabel = Desktop.isMacApp()
    ? t("Show in Finder")
    : Desktop.isWindowsApp()
      ? t("Show in Explorer")
      : t("Show in folder");

  return (
    <Flex gap={4} shrink={false}>
      <Action type="button" onClick={handleOpen}>
        {t("Open")}
      </Action>
      <Action type="button" onClick={handleShowInFolder}>
        {showInFolderLabel}
      </Action>
    </Flex>
  );
}

const Action = styled.button`
  height: 24px;
  padding: 0 8px;
  flex-shrink: 0;
  border: 1px solid ${s("divider")};
  border-radius: 4px;
  background: transparent;
  color: ${s("toastText")};
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: var(--pointer);

  &:hover {
    background: ${s("sidebarActiveBackground")};
  }
`;
