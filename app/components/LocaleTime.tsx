import * as React from "react";
import { locales } from "@shared/utils/date";
import Tooltip from "~/components/Tooltip";
import { useLocaleTime } from "~/hooks/useLocaleTime";

export type Props = {
  children?: React.ReactNode;
  dateTime: string;
  addSuffix?: boolean;
  shorten?: boolean;
  relative?: boolean;
  format?: Partial<Record<keyof typeof locales, string>>;
};

const LocaleTime: React.FC<Props> = ({ children, ...rest }: Props) => {
  const { tooltipContent, content } = useLocaleTime(rest);

  return (
    <Tooltip content={tooltipContent} placement="bottom">
      <time dateTime={rest.dateTime}>{children || content}</time>
    </Tooltip>
  );
};

export default LocaleTime;
