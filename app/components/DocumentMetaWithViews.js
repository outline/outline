// @flow
import { useObserver } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import styled from "styled-components";
import Document from "models/Document";
import DocumentMeta from "components/DocumentMeta";
import DocumentViews from "components/DocumentViews";
import Popover from "components/Popover";
import useStores from "../hooks/useStores";

type Props = {|
  document: Document,
  isDraft: boolean,
  to?: string,
|};

function DocumentMetaWithViews({ to, isDraft, document, ...rest }: Props) {
  const { views } = useStores();
  const { t } = useTranslation();
  const documentViews = useObserver(() => views.inDocument(document.id));
  const totalViewers = documentViews.length;
  const onlyYou = totalViewers === 1 && documentViews[0].user.id;

  const popover = usePopoverState({
    gutter: 8,
    placement: "bottom",
    modal: true,
  });

  return (
    <Meta document={document} to={to} {...rest}>
      {totalViewers && !isDraft ? (
        <PopoverDisclosure {...popover}>
          {(props) => (
            <>
              &nbsp;&middot;&nbsp;
              <a {...props}>
                {t("Viewed by")}{" "}
                {onlyYou
                  ? t("only you")
                  : `${totalViewers} ${
                      totalViewers === 1 ? t("person") : t("people")
                    }`}
              </a>
            </>
          )}
        </PopoverDisclosure>
      ) : null}
      <Popover {...popover} width={300} aria-label={t("Viewers")} tabIndex={0}>
        <DocumentViews document={document} isOpen={popover.visible} />
      </Popover>
    </Meta>
  );
}

const Meta = styled(DocumentMeta)`
  margin: -12px 0 2em 0;
  font-size: 14px;
  position: relative;
  z-index: 1;

  a {
    color: inherit;

    &:hover {
      text-decoration: underline;
    }
  }

  @media print {
    display: none;
  }
`;

export default DocumentMetaWithViews;
