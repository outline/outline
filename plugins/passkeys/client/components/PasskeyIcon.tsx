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
import { PasskeyBrand } from "@shared/utils/passkeys";

interface PasskeyIconProps {
  passkey: {
    name: string;
    userAgent: string | null;
    aaguid: string | null;
  };
  size?: number;
}

/**
 * Displays an appropriate icon based on the passkey's AAGUID, browser, device, and authenticator type.
 *
 * @param passkey - passkey object with aaguid, name, and userAgent.
 * @param size - optional icon size in pixels.
 * @returns icon component representing the passkey type.
 */
function PasskeyIcon({ passkey, size = 24 }: PasskeyIconProps) {
  const { aaguid, userAgent } = passkey;

  // Detect icon based on AAGUID
  const getAaguidIcon = () => {
    if (!aaguid) {
      return undefined;
    }

    switch (aaguid as PasskeyBrand) {
      case PasskeyBrand.ApplePasswords:
      case PasskeyBrand.ICloudKeychainManaged:
      case PasskeyBrand.IPasswords:
        return faApple;

      case PasskeyBrand.WindowsHello1:
      case PasskeyBrand.WindowsHello2:
      case PasskeyBrand.WindowsHello3:
      case PasskeyBrand.MicrosoftPasswordManager:
        return faWindows;

      case PasskeyBrand.GooglePasswordManager:
        return faGoogle;

      case PasskeyBrand.ChromeOnMac:
      case PasskeyBrand.ChromiumBrowser:
        return faChrome;

      case PasskeyBrand.EdgeOnMac:
        return faEdge;

      case PasskeyBrand.SamsungPass:
        return faAndroid;

      default:
        return undefined;
    }
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
  const aaguidIcon = getAaguidIcon();
  const browserIcon = getBrowserIcon();
  const deviceIcon = getDeviceIcon();

  // Prioritize AAGUID icon, then browser icon, then device icon
  const faIcon = aaguidIcon || browserIcon || deviceIcon;

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
