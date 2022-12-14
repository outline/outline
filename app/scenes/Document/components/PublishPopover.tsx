import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import InputSearch from "~/components/InputSearch";

function PublishPopover() {
  const handleOnChange = React.useCallback(() => {
    // TODO: Add missing implementation
    return;
  }, []);

  return (
    <>
      <PublishLocationSearch onChange={handleOnChange} />
    </>
  );
}

const PublishLocationSearch = styled(InputSearch)`
  div {
    border-radius: 16px;
  }
`;

export default observer(PublishPopover);
