// @flow
import * as React from 'react';
import Tooltip from 'components/Tooltip';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
import format from 'date-fns/format';

let callbacks = [];

// This is a shared timer that fires every second, used for
// updating all Time components across the page all at once.
setInterval(() => {
  callbacks.forEach(cb => cb());
}, 1000 * 60);

function eachMinute(fn) {
  callbacks.push(fn);

  return () => {
    callbacks = callbacks.filter(cb => cb !== fn);
  }
}

type Props = {
  dateTime: string,
  children?: React.Node,
};

type State = {
  autoUpdatingDateTime: string
}

class Time extends React.Component<Props, State> {
  removeEachMinuteCallback: () => void;

  state = {
    autoUpdatingDateTime: this.props.dateTime
  }

  componentDidMount() {
    this.removeEachMinuteCallback = eachMinute(() => {
      this.setState({
        autoUpdatingDateTime:
          new Date(
            Date.parse(this.state.autoUpdatingDateTime) + (1000 * 60)
          ).toString()
        });
    });
  }

  componentWillUnmount() {
    this.removeEachMinuteCallback();
  }

  render() {
    return (
      <Tooltip tooltip={format(this.state.autoUpdatingDateTime, 'MMMM Do, YYYY h:mm a')} placement="bottom">
        <time dateTime={this.state.autoUpdatingDateTime}>{this.props.children || distanceInWordsToNow(this.state.autoUpdatingDateTime)}</time>
      </Tooltip>
    );
  }
}

export default Time;
