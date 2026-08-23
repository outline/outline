import { observer } from "mobx-react";
import { Trans } from "react-i18next";
import styled from "styled-components";
import type Notebook from "~/models/Notebook";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
type Props = {
  /** The collection to display the empty state for. */
  notebook: Notebook;
};
function EmptyNotebook({ notebook }: Props) {
  const notebookName = notebook ? notebook.name : "";
  return (
    <Fade>
      <Centered column>
        <Text as="p" type="secondary">
          <Trans
            defaults="<em>{{ notebookName }}</em> doesn’t contain any
                    notes yet."
            values={{
              notebookName,
            }}
            components={{
              em: <strong />,
            }}
          />
        </Text>
      </Centered>
    </Fade>
  );
}
const Centered = styled(Flex)`
  text-align: center;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  max-width: 380px;
  height: 50vh;
`;
export default observer(EmptyNotebook);
