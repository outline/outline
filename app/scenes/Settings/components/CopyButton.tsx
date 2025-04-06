import { LinkIcon } from "outline-icons";
import * as React from "react";
import { toast } from "sonner";
import CopyToClipboard from "~/components/CopyToClipboard";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";

type Props = {
  /** The value to be copied */
  value: string;
  /** The message to show when the value is copied */
  success: string;
  /** The tooltip message */
  tooltip: string;
  /** An optional icon */
  icon?: React.ReactNode;
};

/**
 * A button that copies a value to the clipboard when clicked and shows a
 * single icon.
 */
export function CopyButton({
  value,
  success,
  tooltip,
  icon = <LinkIcon size={20} />,
}: Props) {
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
  }, [success]);

  return (
    <Tooltip content={tooltip} placement="top">
      <CopyToClipboard text={value} onCopy={handleCopied}>
        <NudeButton type="button">{icon}</NudeButton>
      </CopyToClipboard>
    </Tooltip>
  );
}
