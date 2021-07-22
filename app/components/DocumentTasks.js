// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import CircularProgressBar from "components/CircularProgressBar";
import Document from "../models/Document";

type Props = {|
  document: Document,
|};

function DocumentTasks({ document }: Props) {
  const { tasks, tasksPercentage } = document;
  const { t } = useTranslation();
  const { completed, total } = tasks;
  const message =
    completed === 0
      ? t(`{{ total }} tasks`, { total })
      : completed === total
      ? t(`{{ completed }} tasks done`, { completed })
      : t(`{{ completed }} of {{ total }} tasks`, {
          total,
          completed,
        });

  return (
    <>
      <CircularProgressBar percentage={tasksPercentage} />
      &nbsp;{message}
    </>
  );
}

export default DocumentTasks;
