# rfc6902 (vendorized)

This is a vendorized copy of [rfc6902](https://github.com/chbrown/rfc6902), a complete implementation of RFC 6902 JSON Patch.

## Why vendorized?

The upstream `rfc6902` package has a performance issue with the `diffArrays` function. For large arrays, the recursive memoization approach uses excessive memory and CPU, making it impractical for real-world use cases.

This vendorized version includes a fix from [PR #88](https://github.com/chbrown/rfc6902/pull/88) which replaces the recursive approach with an iterative dynamic programming implementation, significantly improving performance for large array comparisons.

## Source

- Original package: https://github.com/chbrown/rfc6902
- Performance fix PR: https://github.com/chbrown/rfc6902/pull/88
- Fork with fix: https://github.com/supermeng/rfc6902/tree/performance
