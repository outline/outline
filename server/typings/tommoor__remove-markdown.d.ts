declare module "@tommoor/remove-markdown" {
  export default function removeMarkdown(
    text: string,
    options?: {
      stripHTML: boolean;
    }
  ): string;
}
