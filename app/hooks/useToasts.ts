import useStores from "./useStores";

export default function useToasts() {
  const { toasts } = useStores();
  return {
    showToast: toasts.showToast,
    hideToast: toasts.hideToast,
  };
}
