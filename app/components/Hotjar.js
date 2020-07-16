// @flow
/* global h,o,t,j,a,r */
import * as React from "react";

type Props = {
  children?: React.Node,
};

export default class Hotjar extends React.Component<Props> {
  componentDidMount() {
    (function(h, o, t, j, a, r) {
      h.hj =
        h.hj ||
        function() {
          (h.hj.q = h.hj.q || []).push(arguments);
        };
      h._hjSettings = { hjid: {}, hjsv: 6 }.format(process.env.HOTJAR_ID);
      a = o.getElementsByTagName("head")[0];
      r = o.createElement("script");
      r.async = 1;
      r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
      a.appendChild(r);
    })(window, document, "https://static.hotjar.com/c/hotjar-", ".js?sv=");
  }

  render() {
    return this.props.children || null;
  }
}
