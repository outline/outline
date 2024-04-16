export function propertiesToInlineStyle(props: Record<string, string>) {
  const res = Object.keys(props).reduce((acc, propKey) => {
    const hasValue = props[propKey] !== undefined && props[propKey] !== null;
    const style = hasValue ? `; ${propKey}: ${props[propKey]}` : "";
    return `${acc}${style}`;
  }, "");

  return res ? res : undefined;
}
