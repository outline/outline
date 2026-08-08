import { Suspense } from "react";
import { useDialogs } from "~/stores/dialogs";
import lazyWithRetry from "~/utils/lazyWithRetry";
import { DialogProvider } from "./DialogContext";

const Guide = lazyWithRetry(() => import("~/components/Guide"));
const Modal = lazyWithRetry(() => import("~/components/Modal"));

export function Dialogs() {
  const guide = useDialogs((state) => state.guide);
  const modalStack = useDialogs((state) => state.modalStack);
  const closeGuide = useDialogs((state) => state.closeGuide);
  const closeModal = useDialogs((state) => state.closeModal);
  const modals = [...modalStack];

  return (
    <DialogProvider>
      <Suspense fallback={null}>
        {guide ? (
          <Guide
            isOpen={guide.isOpen}
            onRequestClose={closeGuide}
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
              closeModal(id);
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

export default Dialogs;
