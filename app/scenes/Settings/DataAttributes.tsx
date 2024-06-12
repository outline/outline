import { observer } from "mobx-react";
import { DatabaseIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import DataAttribute from "~/models/DataAttribute";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import PaginatedList from "~/components/PaginatedList";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import { createDataAttribute } from "~/actions/definitions/dataAttributes";
import useActionContext from "~/hooks/useActionContext";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";

function DataAttributes() {
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const { dataAttributes } = useStores();
  const can = usePolicy(team);
  const context = useActionContext();

  return (
    <Scene
      title={t("Attributes")}
      icon={<DatabaseIcon />}
      actions={
        <>
          {can.createDataAttribute && (
            <Action>
              <Button
                type="submit"
                value={`${t("New Attribute")}…`}
                action={createDataAttribute}
                context={context}
              />
            </Action>
          )}
        </>
      }
    >
      <Heading>{t("Attributes")}</Heading>
      <Text as="p" type="secondary">
        <Trans>
          Attributes allow you to define data to be stored with your documents.
          They can be used to store metadata, tags, or any other structured
          data.
        </Trans>
      </Text>
      <PaginatedList
        fetch={dataAttributes.fetchPage}
        items={dataAttributes.orderedData}
        renderItem={(dataAttribute: DataAttribute) => (
          <span>{JSON.stringify(dataAttribute)}</span>
        )}
      />
    </Scene>
  );
}

export default observer(DataAttributes);
