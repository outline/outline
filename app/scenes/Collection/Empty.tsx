import { observer } from "mobx-react";
import { NewDocumentIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import Collection from "~/models/Collection";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import { editCollectionPermissions } from "~/actions/definitions/collections";
import useActionContext from "~/hooks/useActionContext";
import usePolicy from "~/hooks/usePolicy";
import { newDocumentPath } from "~/utils/routeHelpers";

type Props = {
  collection: Collection;
};

function EmptyCollection({ collection }: Props) {
  const { t } = useTranslation();
  const can = usePolicy(collection);
  const context = useActionContext();
  const collectionName = collection ? collection.name : "";

  return (
    <Centered column>
      <Text type="secondary">
        <Trans
          defaults="<em>{{ collectionName }}</em> doesn’t contain any
                    documents yet."
          values={{
            collectionName,
          }}
          components={{
            em: <strong />,
          }}
        />
        <br />
        {can.createDocument && (
          <Trans>Get started by creating a new one!</Trans>
        )}
      </Text>
      {can.createDocument && (
        <Empty>
          <Link to={newDocumentPath(collection.id)}>
            <Button icon={<NewDocumentIcon />} neutral>
              {t("Create a document")}
            </Button>
          </Link>
          <Button
            action={editCollectionPermissions}
            context={context}
            hideOnActionDisabled
            neutral
          >
            {t("Manage permissions")}…
          </Button>
        </Empty>
      )}
    </Centered>
  );
}

const Centered = styled(Flex)`
  text-align: center;
  margin: 40vh auto 0;
  max-width: 380px;
  transform: translateY(-50%);
`;

const Empty = styled(Flex)`
  justify-content: center;
  margin: 10px 0;
  gap: 8px;
`;

export default observer(EmptyCollection);
