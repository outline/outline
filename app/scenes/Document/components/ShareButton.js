// @flow
import { observer } from "mobx-react";
import { GlobeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { usePopoverState, Popover, PopoverDisclosure } from "reakit/Popover";
import styled from "styled-components";
import Document from "models/Document";
import DocumentShare from "scenes/DocumentShare";
import Button from "components/Button";
import Tooltip from "components/Tooltip";
import useStores from "hooks/useStores";

type Props = {|
  document: Document,
|};

function ShareButton({ document }: Props) {
  const { t } = useTranslation();
  const { shares } = useStores();
  const share = shares.getByDocumentId(document.id);
  const isPubliclyShared = share && share.published;
  const popover = usePopoverState({ gutter: 0, placement: "bottom-end" });

  return (
    <>
      <PopoverDisclosure {...popover}>
        {(props) => (
          <Tooltip
            tooltip={
              isPubliclyShared ? (
                <Trans>
                  Anyone with the link <br />
                  can view this document
                </Trans>
              ) : (
                ""
              )
            }
            delay={500}
            placement="bottom"
          >
            <Button
              icon={isPubliclyShared ? <GlobeIcon /> : undefined}
              neutral
              {...props}
            >
              {t("Share")}
            </Button>
          </Tooltip>
        )}
      </PopoverDisclosure>
      <Popover {...popover} aria-label={t("Share")}>
        {(props) => (
          <Contents {...props}>
            <DocumentShare
              document={document}
              share={share}
              onSubmit={popover.hide}
            />
          </Contents>
        )}
      </Popover>
    </>
  );
}

const Contents = styled.div`
  background: ${(props) => props.theme.menuBackground};
  border-radius: 6px;
  padding: 24px 24px 12px;
  width: 380px;
  box-shadow: ${(props) => props.theme.menuShadow};
  border: ${(props) =>
    props.theme.menuBorder ? `1px solid ${props.theme.menuBorder}` : "none"};
`;

export default observer(ShareButton);
