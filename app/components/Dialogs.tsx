import { observer } from "mobx-react";
import { Suspense } from "react";
import useStores from "~/hooks/useStores";
import lazyWithRetry from "~/utils/lazyWithRetry";

const Guide = lazyWithRetry(() => import("~/components/Guide"));
const Modal = lazyWithRetry(() => import("~/components/Modal"));

function Dialogs() {
  const { dialogs } = useStores();
  const { guide, modalStack } = dialogs;
  const modals = [...modalStack];

  return (
    <>
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
        >
          <Suspense fallback={null}>{modal.content}</Suspense>
        </Modal>
      ))}
    </>
  );
}

export default observer(Dialogs);
