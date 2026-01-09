import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import Flex from "@shared/components/Flex";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import { navigateToHome } from "~/actions/definitions/navigation";
import { client } from "~/utils/ApiClient";

type Props = {
  /** The document ID to request access to. */
  documentId?: string;
};

const Error403 = ({ documentId }: Props) => {
  const { t } = useTranslation();
  const history = useHistory();
  const [requesting, setRequesting] = React.useState(false);
  const [requested, setRequested] = React.useState(false);

  React.useEffect(() => {
    const getAccessRequest = async () => {
      const request = await client.post("/access_requests.info", {
        documentSlug: documentId,
      });

      if (request.data.status === "pending") {
        setRequested(true);
      }
    };

    getAccessRequest();
  }, [documentId]);

  const handleRequestAccess = React.useCallback(async () => {
    if (!documentId || requesting || requested) {
      return;
    }

    try {
      await client.post("/documents.request_access", { id: documentId });
      setRequested(true);
      toast.success(t("Access request sent"));
    } catch {
      toast.error(t("Failed to send access request"));
    } finally {
      setRequesting(false);
    }
  }, [documentId, t, requested, requesting]);

  return (
    <Scene title={t("No access to this doc")}>
      <Heading>{t("No access to this doc")}</Heading>
      <Flex gap={20} style={{ maxWidth: 500 }} column>
        {requested ? (
          <Empty size="large">
            {t(
              "You have sucessfully sent a request to access this document. You will be notified once access is granted."
            )}{" "}
          </Empty>
        ) : (
          <Empty size="large">
            {t(
              "It doesn't look like you have permission to access this document."
            )}{" "}
            {t("You can request access from a document manager.")}
          </Empty>
        )}
        <Flex gap={8}>
          {documentId && (
            <Button
              onClick={handleRequestAccess}
              disabled={requesting || requested}
              neutral={requesting || requested}
            >
              {requested
                ? t("Request sent")
                : requesting
                  ? t("Requesting…")
                  : t("Request access")}
            </Button>
          )}
          <Button action={navigateToHome} hideIcon neutral={!!documentId}>
            {t("Home")}
          </Button>
          <Button onClick={history.goBack} neutral>
            {t("Go back")}
          </Button>
        </Flex>
      </Flex>
    </Scene>
  );
};

export default Error403;
