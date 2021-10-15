// @flow
import { observer } from "mobx-react-lite";
import * as React from "react";
import Guide from "components/Guide";
import useStores from "hooks/useStores";

function Dialogs() {
  const { dialogs } = useStores();
  const { guide } = dialogs;

  return (
    <>
      {guide ? (
        <Guide
          isOpen={guide.isOpen}
          onRequestClose={dialogs.closeGuide}
          title={guide.title}
        >
          {guide.content}
        </Guide>
      ) : undefined}
    </>
  );
}

export default observer(Dialogs);
