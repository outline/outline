import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function EmbedMP4({ matches, ...props }: Props) {
    const source = matches[0];
    return <video width="750" height="500" controls preload="none">
        <source src={source} type="video/mp4"/>
    </video>
}

export default EmbedMP4;
