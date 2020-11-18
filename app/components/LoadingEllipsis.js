// @flow
import * as React from "react";

type Props = {|
  interval?: number,
|};

export default function LoadingEllipsis({ interval = 750 }: Props) {
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    const handle = setInterval(() => {
      setStep((step) => (step === 3 ? 0 : step + 1));
    }, interval);

    return () => clearInterval(handle);
  }, [interval]);

  return ".".repeat(step);
}
