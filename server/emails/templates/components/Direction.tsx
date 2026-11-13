import * as React from "react";

/** The text direction of the email that is being rendered. */
export const DirectionContext = React.createContext<"ltr" | "rtl">("ltr");
