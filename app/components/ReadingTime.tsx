import { EyeIcon } from "outline-icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTextStats } from "~/hooks/useTextStats";
import type Document from "~/models/Document";
import { ProsemirrorHelper } from "~/models/helpers/ProsemirrorHelper";

const ReadingTime = ({ document }: { document: Document }) => {
  const { t } = useTranslation();
  const markdown = useMemo(
    () => ProsemirrorHelper.toMarkdown(document),
    [document]
  );
  const stats = useTextStats(markdown);

  return (
    <>
      <EyeIcon size={18} />
      {t(`{{ minutes }}m read`, {
        minutes: stats.total.readingTime,
      })}
    </>
  );
};

export default ReadingTime;
