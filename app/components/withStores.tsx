import hoistNonReactStatics from "hoist-non-react-statics";
import * as React from "react";
import useStores from "../hooks/useStores";

export type WithStores = <P>(
  Component: React.ComponentType<P>
) => (props: P) => JSX.Element;

const withStores: WithStores = (WrappedComponent) => (props) => {
  const ComponentWithStore = () => {
    const stores = useStores();
    return <WrappedComponent {...props} {...stores} />;
  };

  ComponentWithStore.defaultProps = { ...WrappedComponent.defaultProps };
  ComponentWithStore.displayName = `WithStores(${
    WrappedComponent.name || WrappedComponent.displayName
  })`;

  /**
   * https://reactjs.org/docs/higher-order-components.html#static-methods-must-be-copied-over
   */
  hoistNonReactStatics(ComponentWithStore, WrappedComponent);

  return <ComponentWithStore />;
};

export default withStores;
