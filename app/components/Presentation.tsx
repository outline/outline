import { observer } from "mobx-react";
import { Suspense } from "react";
import useStores from "~/hooks/useStores";
import lazyWithRetry from "~/utils/lazyWithRetry";

const PresentationMode = lazyWithRetry(
  () => import("~/scenes/Document/components/PresentationMode")
);

function Presentation() {
  const { ui } = useStores();

  if (!ui.presentationData) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <PresentationMode
        title={ui.presentationData.title}
        icon={ui.presentationData.icon}
        iconColor={ui.presentationData.color}
        data={ui.presentationData.data}
        onClose={() => {
          ui.presentationData = null;
        }}
      />
    </Suspense>
  );
}

export default observer(Presentation);
