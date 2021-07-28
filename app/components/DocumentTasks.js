// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import CircularProgressBar from "components/CircularProgressBar";
import Document from "../models/Document";

type Props = {|
  document: Document,
|};

function getMessage(t, total, completed) {
  if (completed === 0) {
    if (total === 1) {
      return t(`{{ total }} task`, { total });
    }
    return t(`{{ total }} tasks`, { total });
  } else if (completed === total) {
    if (total === 1) {
      return t(`{{ completed }} task done`, { completed });
    }
    return t(`{{ completed }} tasks done`, { completed });
  } else {
    return t(`{{ completed }} of {{ total }} tasks`, {
      total,
      completed,
    });
  }
}

function DocumentTasks({ document }: Props) {
  const { tasks, tasksPercentage } = document;
  const { t } = useTranslation();
  const { completed, total } = tasks;

  const message = getMessage(t, total, completed);

  return (
    <>
      <CircularProgressBar percentage={tasksPercentage} />
      &nbsp;{message}
    </>
  );
}

export default DocumentTasks;
