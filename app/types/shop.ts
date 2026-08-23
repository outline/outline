/** A printable Pet Store document template. */
export interface DocumentTemplate {
  type: "receipt" | "agreement";
  title: string;
  header: string;
  footer: string;
  showLogo: boolean;
  showStaff: boolean;
  showBranch: boolean;
  body: string;
}
