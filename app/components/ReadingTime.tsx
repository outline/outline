import { EyeIcon } from "outline-icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTextStats } from "~/hooks/useTextStats";
import type Note from "~/models/Note";
import { ProsemirrorHelper } from "~/models/helpers/ProsemirrorHelper";
const ReadingTime = ({ note }: { note: Note }) => {
  const { t } = useTranslation();
  const markdown = useMemo(() => ProsemirrorHelper.toMarkdown(note), [note]);
  const stats = useTextStats(markdown);
  const readingTimeMinutes = stats.total.readingTime;
  const hours = Math.floor(readingTimeMinutes / 60);
  const minutes = readingTimeMinutes % 60;
  let readingTimeText;
  if (hours > 0) {
    if (minutes > 0) {
      readingTimeText = t(`{{ hours }}h {{ minutes }}m read`, {
        hours,
        minutes,
      });
    } else {
      readingTimeText = t(`{{ hours }}h read`, { hours });
    }
  } else {
    readingTimeText = t(`{{ minutes }}m read`, { minutes: readingTimeMinutes });
  }
  return (
    <>
      <EyeIcon size={18} />
      {readingTimeText}
    </>
  );
};
export default ReadingTime;
