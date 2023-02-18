import { TFunction } from "i18next";
import { observer } from "mobx-react";
import { DoneIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { useTheme } from "styled-components";
import Document from "~/models/Document";
import CircularProgressBar from "~/components/CircularProgressBar";
import usePrevious from "~/hooks/usePrevious";
import { bounceIn } from "~/styles/animations";

type Props = {
  document: Document;
};

function getMessage(t: TFunction, total: number, completed: number): string {
  if (completed === 0) {
    return t(`{{ total }} task`, {
      total,
      count: total,
    });
  } else if (completed === total) {
    return t(`{{ completed }} task done`, {
      completed,
      count: completed,
    });
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
  const theme = useTheme();
  const { completed, total } = tasks;
  const done = completed === total;
  const previousDone = usePrevious(done);
  const message = getMessage(t, total, completed);
  return (
    <>
      {completed === total ? (
        <Done
          color={theme.accent}
          size={20}
          $animated={done && previousDone === false}
        />
      ) : (
        <CircularProgressBar percentage={tasksPercentage} />
      )}
      &nbsp;{message}
    </>
  );
}

const Done = styled(DoneIcon)<{ $animated: boolean }>`
  margin: -1px;
  animation: ${(props) => (props.$animated ? bounceIn : "none")} 600ms;
  transform-origin: center center;
`;

export default observer(DocumentTasks);
