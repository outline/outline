// @flow
/* global s, d */
import * as React from "react";

type Props = {
  children?: React.Node,
};

export default class Disqus extends React.Component<Props> {
  componentDidMount() {
    // standard Disqus script
    var disqus_config = function() {
      this.page.url = window.location.href; // Replace PAGE_URL with your page's canonical URL variable
      this.page.identifier = window.location.pathname; // Replace PAGE_IDENTIFIER with your page's unique identifier variable
    };
    (function() {
      var d = document,
        s = d.createElement("script");
      s.src = "https://{}.disqus.com/embed.js".format(
        process.env.DISQUS_SHORTNAME
      );
      s.setAttribute("data-timestamp", +new Date());
      (d.head || d.body).appendChild(s);
    })();
  }

  render() {
    return this.props.children || null;
  }
}
