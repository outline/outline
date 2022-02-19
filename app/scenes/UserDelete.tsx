import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Modal from "~/components/Modal";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

type Props = {
  onRequestClose: () => void;
};

function UserDelete({ onRequestClose }: Props) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { auth } = useStores();
  const { showToast } = useToasts();
  const { t } = useTranslation();

  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setIsDeleting(true);

      try {
        await auth.deleteUser();
        auth.logout();
      } catch (error) {
        showToast(error.message, {
          type: "error",
        });
      } finally {
        setIsDeleting(false);
      }
    },
    [auth, showToast]
  );

  return (
    <Modal isOpen title={t("Delete Account")} onRequestClose={onRequestClose}>
      <Flex column>
        <form onSubmit={handleSubmit}>
          <Text type="secondary">
            <Trans>
              Are you sure? Deleting your account will destroy identifying data
              associated with your user and cannot be undone. You will be
              immediately logged out of Outline and all your API tokens will be
              revoked.
            </Trans>
          </Text>
          <Text type="secondary">
            <Trans
              defaults="<em>Note:</em> Signing back in will cause a new account to be automatically reprovisioned."
              components={{
                em: <strong />,
              }}
            />
          </Text>
          <Button type="submit" danger>
            {isDeleting ? `${t("Deleting")}…` : t("Delete My Account")}
          </Button>
        </form>
      </Flex>
    </Modal>
  );
}

export default observer(UserDelete);
