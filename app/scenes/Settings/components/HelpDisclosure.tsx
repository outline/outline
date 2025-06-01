import * as Collapsible from "@radix-ui/react-collapsible";
import { QuestionMarkIcon } from "outline-icons";
import * as React from "react";
import styled, { useTheme } from "styled-components";
import Button from "~/components/Button";
import Text from "~/components/Text";

type Props = {
  children?: React.ReactNode;
  title: string;
};

const HelpDisclosure: React.FC<Props> = ({ title, children }: Props) => {
  const theme = useTheme();

  return (
    <Collapsible.Root>
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
  overflow: hidden;

  &[data-state="open"] {
    animation: slideDown 250ms ease-out;
  }

  &[data-state="closed"] {
    animation: slideUp 250ms ease-out;
  }

  @keyframes slideDown {
    from {
      height: 0;
      opacity: 0;
    }
    to {
      height: var(--radix-collapsible-content-height);
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      height: var(--radix-collapsible-content-height);
      opacity: 1;
    }
    to {
      height: 0;
      opacity: 0;
    }
  }
`;

export default HelpDisclosure;
