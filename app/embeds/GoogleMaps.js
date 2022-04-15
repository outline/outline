// @flow
import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = new RegExp(
    "^https?://(?:www).google.com/maps/embed?pb=(.*)$"
);

type Props = {|
    attrs: {|
        href: string,
            matches: string[],
  |},
|};

export default class GoogleMaps extends React.Component<Props> {
    static ENABLED = [URL_REGEX];

    render() {
        return (
            <Frame
                {...this.props}
                src={this.props.attrs.href}
                title="Google Maps Embed"
            />
        );
    }
}