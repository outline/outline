/**
 * SVG optimization using SVGO library
 * Provides reliable SVG optimization without breaking Excalidraw drawings
 */

import { optimize, type Config } from 'svgo';

/**
 * SVGO configuration optimized for Excalidraw SVGs
 * Preserves essential attributes while reducing file size
 */
const svgoConfig: Config = {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // Disable plugins that can break Excalidraw drawings
          cleanupIds: false, // Keep IDs for cross-references
          removeViewBox: false, // Keep viewBox for proper scaling
          // Keep essential attributes
          removeUnknownsAndDefaults: {
            keepDataAttrs: true,
            keepAriaAttrs: true,
            keepRoleAttr: true,
          },
        },
      },
    },
  ],
};

/**
 * Optimizes an SVG string using SVGO
 */
export function optimizeSVG(svgString: string): string {
  try {
    const result = optimize(svgString, svgoConfig);
    return result.data;
  } catch {
    // Silently return original SVG if optimization fails
    // This ensures drawings are never lost due to optimization errors
    return svgString;
  }
}

/**
 * Complete SVG optimization pipeline
 * Applies all optimizations with custom configuration
 */
export function optimizeSVGComplete(svgString: string, options: { roundDecimals?: number } = {}): string {
  const { roundDecimals = 2 } = options;

  // Create custom config with decimal precision
  const customConfig: Config = {
    ...svgoConfig,
    floatPrecision: roundDecimals,
  };

  try {
    const result = optimize(svgString, customConfig);
    return result.data;
  } catch {
    // Silently return original SVG if optimization fails
    // This ensures drawings are never lost due to optimization errors
    return svgString;
  }
}
