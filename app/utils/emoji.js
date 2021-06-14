// @flow

export function emojiToUrl(text: string) {
  return `data:image/svg+xml;data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${text}</text></svg>`;
}
