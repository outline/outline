import {
  faChrome,
  faSafari,
  faFirefoxBrowser,
  faEdge,
  faOpera,
  faApple,
  faAndroid,
  faWindows,
  faGoogle,
  faLinux,
} from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { KeyIcon } from "outline-icons";
import styled from "styled-components";

interface PasskeyIconProps {
  passkey: {
    name: string;
    userAgent: string | null;
  };
  size?: number;
}

/**
 * Displays an appropriate icon based on the passkey's browser, device, and authenticator type.
 *
 * @param transports - array of authenticator transports.
 * @param userAgent - user agent string from passkey registration.
 * @param size - optional icon size in pixels.
 * @returns icon component representing the passkey type.
 */
function PasskeyIcon({ passkey, size = 24 }: PasskeyIconProps) {
  const { name, userAgent } = passkey;

  // Detect name-based icons
  const getNameIcon = () => {
    const lowerName = name.toLowerCase();

    if (
      lowerName.includes("apple password") ||
      lowerName.includes("icloud") ||
      lowerName.includes("iPasswords") ||
      lowerName.includes("touch id")
    ) {
      return faApple;
    }

    if (
      lowerName.includes("windows hello") ||
      lowerName.includes("microsoft password")
    ) {
      return faWindows;
    }

    if (lowerName.includes("google password")) {
      return faGoogle;
    }

    return undefined;
  };

  // Detect browser from user agent
  const getBrowserIcon = () => {
    if (!userAgent) {
      return null;
    }

    const ua = userAgent.toLowerCase();

    // Edge (must check before Chrome)
    if (ua.includes("edg/") || ua.includes("edga/") || ua.includes("edgios/")) {
      return faEdge;
    }

    // Opera (must check before Chrome)
    if (ua.includes("opr/") || ua.includes("opera")) {
      return faOpera;
    }

    // Chrome
    if (ua.includes("chrome") && !ua.includes("edg")) {
      return faChrome;
    }

    // Safari
    if (ua.includes("safari") && !ua.includes("chrome")) {
      return faSafari;
    }

    // Firefox
    if (ua.includes("firefox")) {
      return faFirefoxBrowser;
    }

    return null;
  };

  // Detect device from user agent
  const getDeviceIcon = () => {
    if (!userAgent) {
      return null;
    }

    const ua = userAgent.toLowerCase();

    // iPhone or iPad
    if (ua.includes("iphone") || ua.includes("ipad")) {
      return faApple;
    }

    // Android
    if (ua.includes("android")) {
      return faAndroid;
    }

    // Windows
    if (ua.includes("windows")) {
      return faWindows;
    }

    // Linux
    if (ua.includes("linux") && !ua.includes("android")) {
      return faLinux;
    }

    return null;
  };

  // Determine which icon to show
  const nameIcon = getNameIcon();
  const browserIcon = getBrowserIcon();
  const deviceIcon = getDeviceIcon();

  // Prioritize browser icon, fall back to device icon
  const faIcon = nameIcon || browserIcon || deviceIcon;

  if (faIcon) {
    return (
      <FontAwesomeWrapper size={size}>
        <FontAwesomeIcon
          icon={faIcon}
          style={{
            width: size * 0.8,
            height: size * 0.8,
          }}
        />
      </FontAwesomeWrapper>
    );
  }

  return <KeyIcon size={size} />;
}

const FontAwesomeWrapper = styled.span<{ size: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
`;

export default PasskeyIcon;
