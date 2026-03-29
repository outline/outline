declare module "web-haptics" {
  interface Vibration {
    duration: number;
    intensity?: number;
    delay?: number;
  }

  type HapticPattern = number[] | Vibration[];

  interface HapticPreset {
    pattern: Vibration[];
  }

  type HapticInput = number | string | HapticPattern | HapticPreset;

  interface TriggerOptions {
    intensity?: number;
  }

  interface WebHapticsOptions {
    debug?: boolean;
    showSwitch?: boolean;
  }

  export {
    HapticInput,
    HapticPattern,
    HapticPreset,
    TriggerOptions,
    Vibration,
    WebHapticsOptions,
  };
}

declare module "web-haptics/react" {
  import type {
    HapticInput,
    TriggerOptions,
    WebHapticsOptions,
  } from "web-haptics";

  function useWebHaptics(options?: WebHapticsOptions): {
    trigger: (
      input?: HapticInput,
      options?: TriggerOptions
    ) => Promise<void> | undefined;
    cancel: () => void | undefined;
    isSupported: boolean;
  };

  export { useWebHaptics };
}
