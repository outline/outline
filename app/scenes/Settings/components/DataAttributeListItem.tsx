import { observer } from "mobx-react";
import * as React from "react";
import DataAttribute from "~/models/DataAttribute";
import ListItem from "~/components/List/Item";
import DataAttributeMenu from "~/menus/DataAttributeMenu";
import { DataAttributesHelper } from "~/utils/DataAttributesHelper";

type Props = {
  dataAttribute: DataAttribute;
};

export const DataAttributeListItem = observer(function DataAttributeListItem_({
  dataAttribute,
}: Props) {
  const image = DataAttributesHelper.getIcon(dataAttribute.dataType);

  return (
    <ListItem
      key={dataAttribute.id}
      title={dataAttribute.name}
      subtitle={dataAttribute.description || dataAttribute.dataType}
      image={image}
      actions={<DataAttributeMenu dataAttribute={dataAttribute} />}
    />
  );
});
