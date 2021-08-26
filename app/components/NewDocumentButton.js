// @flow
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Button from "components/Button";
import { newDocumentUrl } from "utils/routeHelpers";

const NewDocumentButton = () => {
  const { t } = useTranslation();

  return (
    <Button as={Link} to={newDocumentUrl()} icon={<PlusIcon />}>
      {t("New draft doc")}
    </Button>
  );
};

export default NewDocumentButton;
