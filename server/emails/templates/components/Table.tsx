import type * as React from "react";

/**
 * A layout table without the default spacing that email clients apply.
 *
 * @param props the attributes of the table.
 * @returns the table element.
 */
export const Table = (props: React.TableHTMLAttributes<HTMLTableElement>) => (
  <table
    role="presentation"
    border={0}
    cellSpacing={0}
    cellPadding={0}
    {...props}
  />
);

/** Alias of the native tbody element. */
export const TBody = "tbody";

/** Alias of the native tr element. */
export const TR = "tr";

/** Alias of the native td element. */
export const TD = "td";
