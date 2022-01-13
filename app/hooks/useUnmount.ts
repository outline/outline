import * as React from "react";

const useUnmount = (callback: (...args: Array<any>) => any) => {
  const ref = React.useRef(callback);
  ref.current = callback;

  React.useEffect(() => {
    return () => {
      ref.current();
    };
  }, []);
};

export default useUnmount;
