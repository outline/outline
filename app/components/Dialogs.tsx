import { observer } from "mobx-react";
import Guide from "~/components/Guide";
import Modal from "~/components/Modal";
import useStores from "~/hooks/useStores";

function Dialogs() {
  const { dialogs } = useStores();
  const { guide, modalStack } = dialogs;
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
      {[...modalStack].map(([id, modal]) => (
        <Modal
          key={id}
          isOpen={modal.isOpen}
          fullscreen={modal.fullscreen ?? false}
          onRequestClose={() => {
            modal.onClose?.();
            dialogs.closeModal(id);
          }}
          title={modal.title}
          style={modal.style}
        >
          {modal.content}
        </Modal>
      ))}
    </>
  );
}

export default observer(Dialogs);
