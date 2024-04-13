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
    <>
      <Disclosure {...disclosure}>
        {(props) => (
          <StyledButton
            icon={<QuestionMarkIcon color={theme.textSecondary} />}
            neutral
            aria-label={title}
            borderOnHover
            {...props}
          />
        )}
      </Disclosure>
      <HelpContent {...disclosure}>
        <Text as="p" type="secondary">
          {children}
        </Text>
      </HelpContent>
    </>
  );
};

const StyledButton = styled(Button)`
  position: absolute;
  top: 20px;
  right: 50px;
`;

const HelpContent = styled(DisclosureContent)`
  transition: opacity 250ms ease-in-out;
  opacity: 0;

  &[data-enter] {
    opacity: 1;
  }
`;

export default HelpDisclosure;
