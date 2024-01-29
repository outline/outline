import hoistNonReactStatics from "hoist-non-react-statics";
import * as React from "react";
import RootStore from "~/stores/RootStore";
import useStores from "~/hooks/useStores";

type StoreProps = keyof RootStore;

function withStores<
  P extends React.ComponentType<ResolvedProps & RootStore>,
  ResolvedProps = JSX.LibraryManagedAttributes<
    P,
    Omit<React.ComponentProps<P>, StoreProps>
  >
>(WrappedComponent: P): React.FC<ResolvedProps> {
  const ComponentWithStore = (props: ResolvedProps) => {
    const stores = useStores();
    return <WrappedComponent {...(props as any)} {...stores} />;
  };

  ComponentWithStore.displayName = `WithStores(${
    WrappedComponent.name || WrappedComponent.displayName
  })`;

  /**
   * https://reactjs.org/docs/higher-order-components.html#static-methods-must-be-copied-over
   */
  hoistNonReactStatics(ComponentWithStore, WrappedComponent);

  return ComponentWithStore;
}

export default withStores;
