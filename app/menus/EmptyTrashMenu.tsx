import { observer } from "mobx-react";
import { TrashIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { useHistory } from "react-router";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Modal from "~/components/Modal";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

function EmptyTrashMenu() {
  const { t } = useTranslation();
  const { documents } = useStores();
  const [showModal, setShowModal] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { showToast } = useToasts();
  const history = useHistory();

  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();

      try {
        setIsDeleting(true);
        const trashed = await documents.fetchDeleted();
        trashed.forEach(
          async (doc) =>
            await documents.delete(doc, {
              permanent: true,
            })
        );
        showToast(t("Trash permanently deleted"), {
          type: "success",
        });
        history.push("/trash");
        setShowModal(false);
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      } finally {
        setIsDeleting(false);
      }
    },
    [documents, history, showToast, t]
  );

  return (
    <>
      <Button
        icon={<TrashIcon />}
        danger={true}
        onClick={() => setShowModal(true)}
      >
        {t("Empty trash")}
      </Button>
      {showModal && (
        <Modal
          title={t("Empty trash")}
          isOpen={showModal}
          onRequestClose={() => setShowModal(false)}
          isCentered
        >
          <Flex column>
            <form onSubmit={handleSubmit}>
              <Text type="secondary">
                <Trans
                  defaults="Are you sure you want to permanently delete all documents in the trash? This action cannot be undone."
                  components={{
                    em: <strong />,
                  }}
                />
              </Text>
              <Button type="submit" danger>
                {isDeleting ? `${t("Deleting")}…` : t("I’m sure – Delete")}
              </Button>
            </form>
          </Flex>
        </Modal>
      )}
    </>
  );
}

export default observer(EmptyTrashMenu);
