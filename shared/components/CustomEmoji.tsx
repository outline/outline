import useShare from "@shared/hooks/useShare";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  value: string;
  size?: number | string;
  /** Optional cache-busting key, e.g. updatedAt timestamp. */
  cacheKey?: string;
};

export const CustomEmoji = ({
  value,
  size = 16,
  cacheKey,
  ...props
}: Props) => {
  const { shareId } = useShare();
  let src = `/api/emojis.redirect?id=${value}`;
  if (shareId) {
    src += `&shareId=${shareId}`;
  }
  if (cacheKey) {
    src += `&v=${encodeURIComponent(cacheKey)}`;
  }
  return (
    <img
      alt=""
      src={src}
      style={{ width: size, height: size, objectFit: "contain" }}
      {...props}
    />
  );
};
