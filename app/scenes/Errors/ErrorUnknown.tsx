import { faFaceFrown } from "@fortawesome/free-solid-svg-icons/faFaceFrown";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Trans, useTranslation } from "react-i18next";
import styled, { css, keyframes } from "styled-components";
import { IconTitleWrapper } from "@shared/components/Icon";
import { s } from "@shared/styles";
import Button from "~/components/Button";
import CenteredContent from "~/components/CenteredContent";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import PageTitle from "~/components/PageTitle";
import { navigateToHome } from "~/actions/definitions/navigation";
import { HStack } from "~/components/primitives/HStack";
import { VStack } from "~/components/primitives/VStack";

const ErrorUnknown = () => {
  const { t } = useTranslation();

  return (
    <CenteredContent>
      <PageTitle title={t("Something went wrong")} />
      <Title>
        <IconTitleWrapper aria-hidden>
          <GlitchIcon>
            <FontAwesomeIcon icon={faFaceFrown} />
            <GlitchLayer>
              <FontAwesomeIcon icon={faFaceFrown} />
            </GlitchLayer>
            <GlitchLayer $reverse>
              <FontAwesomeIcon icon={faFaceFrown} />
            </GlitchLayer>
          </GlitchIcon>
        </IconTitleWrapper>
        {t("Something went wrong")}
      </Title>
      <VStack spacing={20} style={{ maxWidth: 500 }} align="initial">
        <Empty size="large">
          <Trans>
            Sorry, an unknown error occurred loading the page. Please try again
            or contact support if the issue persists.
          </Trans>
        </Empty>
        <HStack>
          <Button action={navigateToHome} neutral hideIcon>
            {t("Home")}
          </Button>
        </HStack>
      </VStack>
    </CenteredContent>
  );
};

const red = "rgba(255, 0, 80, 0.75)";
const cyan = "rgba(0, 220, 255, 0.75)";

const iconGlitch = keyframes`
  0%, 88%, 100% {
    transform: none;
  }
  89% {
    transform: translate(-2px, 1px) skewX(10deg);
  }
  91% {
    transform: translate(2px, -1px) skewX(-6deg);
  }
  93% {
    transform: translate(-1px, 0);
  }
  95% {
    transform: none;
  }
`;

const sliceGlitch = keyframes`
  0%, 88%, 100% {
    clip-path: inset(100% 0 0 0);
    transform: none;
  }
  89% {
    clip-path: inset(10% 0 65% 0);
    transform: translate(-4px, 0);
  }
  90% {
    clip-path: inset(55% 0 20% 0);
    transform: translate(4px, 0);
  }
  91.5% {
    clip-path: inset(30% 0 45% 0);
    transform: translate(-3px, 0);
  }
  93% {
    clip-path: inset(75% 0 5% 0);
    transform: translate(3px, 0);
  }
  94.5% {
    clip-path: inset(0 0 85% 0);
    transform: translate(-2px, 0);
  }
  96% {
    clip-path: inset(100% 0 0 0);
    transform: none;
  }
`;

const Title = styled(Heading)`
  position: relative;
`;

const GlitchIcon = styled.span`
  position: relative;
  display: flex;
  animation: ${iconGlitch} 4s steps(1, end) infinite;

  svg {
    width: 27px;
    height: 27px;
  }
`;

const GlitchLayer = styled.span<{ $reverse?: boolean }>`
  position: absolute;
  inset: 0;
  display: flex;
  background: ${s("background")};
  clip-path: inset(100% 0 0 0);
  pointer-events: none;
  animation: ${sliceGlitch} 4s steps(1, end) infinite;

  ${(props) =>
    props.$reverse
      ? css`
          animation-delay: 0.05s;

          svg {
            filter: drop-shadow(2px 0 ${cyan});
          }
        `
      : css`
          svg {
            filter: drop-shadow(-2px 0 ${red});
          }
        `}
`;

export default ErrorUnknown;
