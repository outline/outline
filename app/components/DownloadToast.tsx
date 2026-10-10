import { t } from "i18next";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Desktop from "~/utils/Desktop";

type DownloadedFile = {
  /** The user facing name of the downloaded file. */
  fileName: string;
  /** The absolute path the file was saved to. */
  filePath: string;
};

/**
 * Displays a toast notifying that a file finished downloading, with the file
 * name and actions to open the file or reveal it in the file manager. Desktop
 * app only.
 *
 * @param file the name and path of the downloaded file.
 */
export function showDownloadToast(file: DownloadedFile) {
  const toastId = `download-${file.filePath}`;

  toast.message(t("Download complete"), {
    id: toastId,
    description: <DownloadToastDescription file={file} toastId={toastId} />,
  });
}

function DownloadToastDescription({
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
    <Flex column gap={8}>
      {file.fileName}
      <Flex gap={4}>
        <Button onClick={handleOpen} neutral>
          {t("Open")}
        </Button>
        <Button onClick={handleShowInFolder} neutral>
          {showInFolderLabel}
        </Button>
      </Flex>
    </Flex>
  );
}
