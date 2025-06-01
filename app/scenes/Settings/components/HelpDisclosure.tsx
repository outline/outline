import * as Collapsible from "@radix-ui/react-collapsible";
import { QuestionMarkIcon } from "outline-icons";
import * as React from "react";
import styled, { useTheme } from "styled-components";
import Button from "~/components/Button";
import Text from "~/components/Text";

type Props = {
  children?: React.ReactNode;
  title: React.ReactNode;
};

const HelpDisclosure: React.FC<Props> = ({ title, children }: Props) => {
  const [open, setOpen] = React.useState(false);
  const theme = useTheme();

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger asChild>
        <StyledButton
          icon={<QuestionMarkIcon color={theme.textSecondary} />}
          neutral
          aria-label={title}
          borderOnHover
        />
      </Collapsible.Trigger>
      <HelpContent>
        <Text as="p" type="secondary">
          {children}
        </Text>
      </HelpContent>
    </Collapsible.Root>
  );
};

const StyledButton = styled(Button)`
  position: absolute;
  top: 20px;
  right: 50px;
`;

const HelpContent = styled(Collapsible.Content)`
  transition: opacity 250ms ease-in-out;
  opacity: 0;

  &[data-state="open"] {
    opacity: 1;
  }
`;

export default HelpDisclosure;
