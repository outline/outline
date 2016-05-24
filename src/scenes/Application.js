import React from "react";
import Helmet from "react-helmet";

const Application = (props) => {
  return (
    <div style={{ width: '100%' }}>
      <Helmet
        title="Beautiful Atlas"
        meta={[
          {"name": "viewport", "content": "width=device-width, initial-scale=1.0"},
        ]}
      />
      { props.children }
    </div>
  );
};

Application.propTypes = {
  children: React.PropTypes.node.isRequired,
}

export default Application;