// @flow
import distanceInWordsToNow from "date-fns/distance_in_words_to_now";
import format from "date-fns/format";
import * as React from "react";
import Tooltip from "components/Tooltip";

let callbacks = [];

// This is a shared timer that fires every minute, used for
// updating all Time components across the page all at once.
setInterval(() => {
  callbacks.forEach((cb) => cb());
}, 1000 * 60);

function eachMinute(fn) {
  callbacks.push(fn);

  return () => {
    callbacks = callbacks.filter((cb) => cb !== fn);
  };
}

type Props = {
  dateTime: string,
  children?: React.Node,
  tooltipDelay?: number,
  addSuffix?: boolean,
  shorten?: boolean,
};

class Time extends React.Component<Props> {
  removeEachMinuteCallback: () => void;

  componentDidMount() {
    this.removeEachMinuteCallback = eachMinute(() => {
      this.forceUpdate();
    });
  }

  componentWillUnmount() {
    this.removeEachMinuteCallback();
  }

  render() {
    const { shorten, addSuffix } = this.props;
    let content = distanceInWordsToNow(this.props.dateTime, {
      addSuffix,
    });

    if (shorten) {
      content = content
        .replace("about", "")
        .replace("less than a minute ago", "just now")
        .replace("minute", "min");
    }

    return (
      <Tooltip
        tooltip={format(this.props.dateTime, "MMMM Do, YYYY h:mm a")}
        delay={this.props.tooltipDelay}
        placement="bottom"
      >
        <time dateTime={this.props.dateTime}>
          {this.props.children || content}
        </time>
      </Tooltip>
    );
  }
}

export default Time;
