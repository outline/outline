import * as React from "react";

const style: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: "20px",
  display: "inline-block",
  padding: "10px 20px",
  color: "#111319",
  background: "#F9FBFC",
  fontWeight: "500",
  borderRadius: "2px",
  letterSpacing: "0.1em",
};

const CopyableCode: React.FC = (props) => (
  <pre {...props} style={style}>
    {props.children}
  </pre>
);

export default CopyableCode;
