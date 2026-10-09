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
  /** Additional content shown below the date in the tooltip. */
  tooltipDetail?: React.ReactNode;
};

const LocaleTime: React.FC<Props> = ({
  children,
  tooltipDetail,
  ...rest
}: Props) => {
  const { tooltipContent, content } = useLocaleTime(rest);
  const [isInteractive, setIsInteractive] = React.useState(false);
  // Detail is only available in the tooltip, so it must be reachable by keyboard.
  const hasDetail = !!tooltipDetail;

  const time = (
    <time
      dateTime={rest.dateTime}
      tabIndex={hasDetail ? 0 : undefined}
      onPointerEnter={() => setIsInteractive(true)}
      onFocus={() => setIsInteractive(true)}
    >
      {children || content}
    </time>
  );

  return isInteractive || hasDetail ? (
    <Tooltip
      content={
        hasDetail ? (
          <>
            {tooltipContent}
            <br />
            {tooltipDetail}
          </>
        ) : (
          tooltipContent
        )
      }
      placement="bottom"
    >
      {time}
    </Tooltip>
  ) : (
    time
  );
};

export default LocaleTime;
