import * as React from "react";

/**
 * Hook that executes a callback when the component unmounts.
 *
 * @param callback Function to be called on component unmount
 */
const useUnmount = (callback: (...args: Array<any>) => any) => {
  const ref = React.useRef(callback);
  ref.current = callback;

  React.useEffect(
    () => () => {
      ref.current();
    },
    []
  );
};

export default useUnmount;
