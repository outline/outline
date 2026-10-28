import { DocumentIcon as BaseDocumentIcon } from "outline-icons";

interface Props {
  /** The size of the icon, 24px is default to match standard icons. */
  size?: number;
  /** The color of the icon, defaults to the current text color. */
  color?: string;
  /** Whether the document has no content, shown as an outlined page. */
  empty?: boolean;
  /** An optional class name. */
  className?: string;
}

/**
 * The default icon for a document. Documents with no content are shown with
 * an outlined page of the same shape.
 *
 * @param props the icon props.
 * @returns the icon element.
 */
export function DocumentIcon({
  empty,
  size = 24,
  color = "currentColor",
  ...rest
}: Props) {
  if (!empty) {
    return <BaseDocumentIcon size={size} color={color} {...rest} />;
  }

  return (
    <svg
      fill={color}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <path
        fillRule="evenodd"
        d="M12 4V9C12 10.105 12.895 11 14 11H19V18C19 19.105 18.105 20 17 20H7C5.895 20 5 19.105 5 18V6C5 4.895 5.895 4 7 4H12ZM10.5 5.5H7C6.724 5.5 6.5 5.724 6.5 6V18C6.5 18.276 6.724 18.5 7 18.5H17C17.276 18.5 17.5 18.276 17.5 18V12.5H14C12.067 12.5 10.5 10.933 10.5 9V5.5Z"
      />
      <path d="M14 4L19 9H14V4Z" />
    </svg>
  );
}
