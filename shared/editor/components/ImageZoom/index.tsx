import React, { useState } from "react";
import { Controlled, ControlledProps } from "./Controlled";
import Styles from "./Styles";

export type UncontrolledProps = Omit<
  ControlledProps,
  "isZoomed" | "onZoomChange"
>;

export default function Zoom(props: UncontrolledProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <>
      <Styles />
      <Controlled {...props} isZoomed={isZoomed} onZoomChange={setIsZoomed} />
    </>
  );
}
