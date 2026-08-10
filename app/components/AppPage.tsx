import type { ReactNode } from "react";
import { useEffect } from "react";
import styled from "styled-components";
import { s } from "@shared/styles";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import Text from "~/components/Text";
import Scene from "~/components/Scene";
import { useShop } from "~/stores/shop";

const Frame = styled.div`
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 4px 64px;
`;

const Header = styled(Flex)`
  margin-bottom: 24px;
  gap: 12px;
`;

const ErrorNote = styled.p`
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 14px;
  color: ${s("danger")};
  background: ${s("backgroundSecondary")};
`;

interface Props {
  /** Title shown in the scene header and browser tab. */
  title: string;
  /** Short description rendered under the title. */
  description?: ReactNode;
  /** Actions rendered to the right of the heading. */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Shared frame for the pet store pages.
 *
 * Loads the pet store data once per mount and renders inside Outline's Scene
 * so the sidebar, header and page chrome stay identical to the rest of the app.
 * The frame is built from Outline's own components so it follows the theme –
 * hard-coded colours here left every page unreadable in dark mode.
 *
 * @returns the rendered scene.
 */
export function AppPage({ title, description, actions, children }: Props) {
  const fetchAll = useShop((state) => state.fetchAll);
  const isLoading = useShop((state) => state.isLoading);
  const error = useShop((state) => state.error);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return (
    <Scene title={title}>
      <Frame>
        <Header align="flex-start" justify="space-between" wrap>
          <Flex column style={{ minWidth: 0, flex: 1 }}>
            <Heading>{title}</Heading>
            {description ? (
              <Text as="p" type="secondary">
                {description}
              </Text>
            ) : null}
          </Flex>
          {actions ? (
            <Flex align="center" gap={12} style={{ flexShrink: 0 }}>
              {actions}
            </Flex>
          ) : null}
        </Header>

        {error ? <ErrorNote>{error}</ErrorNote> : null}

        {isLoading && !error ? (
          <Text as="p" type="tertiary" size="small">
            Loading…
          </Text>
        ) : null}

        {children}
      </Frame>
    </Scene>
  );
}
