// @flow
import * as React from "react";
import CircularProgressBar from "components/CircularProgressBar";
import Document from "../models/Document";

type Props = {|
  document: Document,
|};

function ProgressBar({ document }: Props) {
  const { tasks, tasksPercentage } = document;
  const message =
    tasks.completed === 0
      ? `${tasks.total} tasks`
      : tasks.completed === tasks.total
      ? `${tasks.completed} tasks done`
      : `${tasks.completed} of ${tasks.total} tasks`;

  return (
    <>
      <CircularProgressBar percentage={tasksPercentage} />
      &nbsp;{message}
    </>
  );
}

export default ProgressBar;
