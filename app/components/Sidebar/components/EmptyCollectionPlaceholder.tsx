import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Text from "~/components/Text";

const EmptyCollectionPlaceholder = () => {
  const { t } = useTranslation();
  return (
    <Empty type="tertiary" size="small">
      {t("Empty")}
    </Empty>
  );
};

const Empty = styled(Text)`
  margin-left: 46px;
  margin-bottom: 0;
  line-height: 34px;
  font-style: italic;
`;

export default EmptyCollectionPlaceholder;
