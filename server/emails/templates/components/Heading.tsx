import * as React from "react";

const style = {
  fontWeight: 500,
  fontSize: "18px",
};

const Heading: React.FC<React.PropsWithChildren> = ({ children }) => (
  <p>
    <span style={style}>{children}</span>
  </p>
);

export default Heading;
