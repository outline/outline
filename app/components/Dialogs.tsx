import { observer } from "mobx-react";
import { Suspense } from "react";
import { usePathnameChange } from "~/hooks/usePathnameChange";
import useStores from "~/hooks/useStores";
import lazyWithRetry from "@shared/utils/lazyWithRetry";
import { DialogProvider } from "./DialogContext";

const Guide = lazyWithRetry(() => import("~/components/Guide"));
const Modal = lazyWithRetry(() => import("~/components/Modal"));

function Dialogs() {
  const { dialogs } = useStores();
  const { guide, modalStack } = dialogs;
  const modals = [...modalStack];

  // Close open modals when navigating to another page.
  usePathnameChange(() => {
    dialogs.modalStack.forEach((modal) => modal.onClose?.());
    dialogs.closeAllModals();
  });

  return (
    <DialogProvider>
      <Suspense fallback={null}>
        {guide ? (
          <Guide
            isOpen={guide.isOpen}
            onRequestClose={dialogs.closeGuide}
            title={guide.title}
          >
            {guide.content}
          </Guide>
        ) : undefined}
        {modals.map(([id, modal]) => (
          <Modal
            key={id}
            isOpen={modal.isOpen}
            onRequestClose={() => {
              modal.onClose?.();
              dialogs.closeModal(id);
            }}
            title={modal.title}
            style={modal.style}
            width={modal.width}
            height={modal.height}
          >
            {modal.content}
          </Modal>
        ))}
      </Suspense>
    </DialogProvider>
  );
}

export default observer(Dialogs);
