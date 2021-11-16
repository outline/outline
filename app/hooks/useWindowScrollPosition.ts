// Based on https://github.com/rehooks/window-scroll-position which is no longer
// maintained.
import { throttle } from "lodash";
import { useState, useEffect } from "react";

let supportsPassive = false;

try {
  const opts = Object.defineProperty({}, "passive", {
    get: function () {
      supportsPassive = true;
    },
  });
  // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
  window.addEventListener("testPassive", null, opts);
  // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
  window.removeEventListener("testPassive", null, opts);
} catch (e) {
  // No-op
}

const getPosition = () => ({
  x: window.pageXOffset,
  y: window.pageYOffset,
});

const defaultOptions = {
  throttle: 100,
};

export default function useWindowScrollPosition(options: {
  throttle: number;
}): {
  x: number;
  y: number;
} {
  const opts = Object.assign({}, defaultOptions, options);
  const [position, setPosition] = useState(getPosition());

  useEffect(() => {
    const handleScroll = throttle(() => {
      setPosition(getPosition());
    }, opts.throttle);
    window.addEventListener(
      "scroll",
      handleScroll,
      supportsPassive
        ? {
            passive: true,
          }
        : false
    );
    return () => {
      handleScroll.cancel();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [opts.throttle]);

  return position;
}
