import * as React from "react";
import type { locales } from "@shared/utils/date";
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
  const [isInteractive, setIsInteractive] = React.useState(false);

  const time = (
    <time
      dateTime={rest.dateTime}
      onPointerEnter={() => setIsInteractive(true)}
      onFocus={() => setIsInteractive(true)}
    >
      {children || content}
    </time>
  );

  return isInteractive ? (
    <Tooltip content={tooltipContent} placement="bottom">
      {time}
    </Tooltip>
  ) : (
    time
  );
};

export default LocaleTime;
