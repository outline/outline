// @flow
// Based on https://github.com/rehooks/window-scroll-position which is no longer
// maintained.
import { throttle } from "lodash";
import { useState, useEffect } from "react";

let supportsPassive = false;
try {
  var opts = Object.defineProperty({}, "passive", {
    get: function () {
      supportsPassive = true;
    },
  });
  window.addEventListener("testPassive", null, opts);
  window.removeEventListener("testPassive", null, opts);
} catch (e) {}

const getPosition = () => ({
  x: window.pageXOffset,
  y: window.pageYOffset,
});

const defaultOptions = {
  throttle: 100,
};

export default function useWindowScrollPosition(options: {
  throttle: number,
}): { x: number, y: number } {
  let opts = Object.assign({}, defaultOptions, options);

  let [position, setPosition] = useState(getPosition());

  useEffect(() => {
    let handleScroll = throttle(() => {
      setPosition(getPosition());
    }, opts.throttle);

    window.addEventListener(
      "scroll",
      handleScroll,
      supportsPassive ? { passive: true } : false
    );

    return () => {
      handleScroll.cancel();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [opts.throttle]);

  return position;
}
