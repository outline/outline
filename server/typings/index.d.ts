declare module "sequelize-encrypted";

declare module "styled-components-breakpoint";

declare module "formidable/lib/file";

declare module "oy-vey";

declare module "email-providers" {
  const list: string[];
  export default list;
}

declare module "ukkonen" {
  export default function ukkonen(
    first: string,
    second: string,
    limit?: number
  ): number;
}
