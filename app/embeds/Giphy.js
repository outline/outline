// @flow
import * as React from "react";
import Frame from "./components/Frame";

const URL_REGEX = new RegExp("^https?://giphy.com/gifs/(.*)$");

type Props = {|
    attrs: {|
        href: string,
            matches: string[],
  |},
|};

export default class Giphy extends React.Component<Props> {
    static ENABLED = [URL_REGEX];

    render() {
        const contentID = this.props.attrs.href.split("-").pop();

        return (
            <Frame
                {...this.props}
                src={`https://media.giphy.com/media/${contentID}/source.gif`}
                title="Giphy Embed"
            />
        );
    }
}