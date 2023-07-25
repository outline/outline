import { QuestionMarkIcon } from "outline-icons";
import * as React from "react";
import {
  useDisclosureState,
  Disclosure,
  DisclosureContent,
} from "reakit/Disclosure";
import styled, { useTheme } from "styled-components";
import Button from "~/components/Button";
import Text from "~/components/Text";

type Props = {
  children?: React.ReactNode;
  title: React.ReactNode;
};

const HelpDisclosure: React.FC<Props> = ({ title, children }: Props) => {
  const disclosure = useDisclosureState({ animated: true });
  const theme = useTheme();

  return (
    <div>
      <Disclosure {...disclosure}>
        {(props) => (
          <Button
            icon={<QuestionMarkIcon color={theme.text} />}
            neutral
            borderOnHover
            {...props}
          >
            {title}
          </Button>
        )}
      </Disclosure>
      <HelpContent {...disclosure}>
        <Text type="secondary">
          <br />
          {children}
        </Text>
      </HelpContent>
    </div>
  );
};

const HelpContent = styled(DisclosureContent)`
  transition: opacity 250ms ease-in-out;
  opacity: 0;

  &[data-enter] {
    opacity: 1;
  }
`;

export default HelpDisclosure;
