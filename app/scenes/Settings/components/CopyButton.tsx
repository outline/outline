import { LinkIcon } from "outline-icons";
import * as React from "react";
import { toast } from "sonner";
import CopyToClipboard from "~/components/CopyToClipboard";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";

export function CopyButton({
  value,
  success,
  tooltip,
  icon = <LinkIcon size={20} />,
}: {
  value: string;
  success: string;
  tooltip: string;
  icon?: React.ReactNode;
}) {
  const timeout = React.useRef<ReturnType<typeof setTimeout>>();

  const handleCopied = React.useCallback(() => {
    timeout.current = setTimeout(() => {
      toast.message(success);
    }, 100);

    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
    };
  }, []);

  return (
    <Tooltip content={tooltip} placement="top">
      <CopyToClipboard text={value} onCopy={handleCopied}>
        <NudeButton type="button">{icon}</NudeButton>
      </CopyToClipboard>
    </Tooltip>
  );
}
