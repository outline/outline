import React from "react";
import { UserPreference } from "@shared/types";
import useCurrentUser from "~/hooks/useCurrentUser";
import Heading from "./Heading";

interface Props {
  as?: "h1" | "h2" | "h3";
  centered?: boolean;
  children: React.ReactNode;
  sectionNumber?: string;
}

export const NumberedHeading: React.FC<Props> = ({
  as = "h1",
  centered,
  children,
  sectionNumber,
}) => {
  const user = useCurrentUser();
  const showNumbers = user?.getPreference(
    UserPreference.NumberedHeadings,
    false
  );
  const level = parseInt(as.replace("h", ""));

  return (
    <Heading
      as={as}
      centered={centered}
      data-numbered={showNumbers ? "true" : undefined}
      data-level={level}
      data-number={sectionNumber}
    >
      {children}
    </Heading>
  );
};
