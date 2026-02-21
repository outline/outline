import { inflate } from "pako";
import extract from "png-chunks-extract";

export enum ImageSource {
  DiagramsNet = "diagrams.net",
}

export default class FileHelper {
  /**
   * Checks if a file is an image.
   *
   * @param contentType The content type of the file
   * @returns True if the file is an image
   */
  static isImage(contentType: string) {
    return /^image\/[!#$%&'*+.^\w`|~-]+$/i.test(contentType);
  }

  /**
   * Checks if a file is a video.
   *
   * @param contentType The content type of the file
   * @returns True if the file is an video
   */
  static isVideo(contentType: string) {
    return /^video\/[!#$%&'*+.^\w`|~-]+$/i.test(contentType);
  }

  /**
   * Checks if a file is an audio file.
   *
   * @param contentType The content type of the file
   * @returns True if the file is an audio file
   */
  static isAudio(contentType: string) {
    return /^audio\/[!#$%&'*+.^\w`|~-]+$/i.test(contentType);
  }

  /**
   * Checks if a file is a pdf.
   *
   * @param contentType The content type of the file
   * @returns True if the file is a pdf
   */
  static isPdf(contentType: string) {
    return /^application\/pdf$/i.test(contentType);
  }

  /**
   * Download a file from a URL and return it as a File object.
   *
   * @param url The URL to download the file from
   * @returns The downloaded file
   */
  static async getFileForUrl(url: string): Promise<File> {
    const response = await fetch(url);
    const blob = await response.blob();
    const fileName = (response.headers.get("content-disposition") || "").split(
      "filename="
    )[1];
    return new File([blob], fileName || "file", {
      type: blob.type,
    });
  }

  /**
   * Loads the dimensions of a video file.
   *
   * @param file The file to load the dimensions for
   * @returns The dimensions of the video
   */
  static getVideoDimensions(
    file: File
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.crossOrigin = "anonymous";
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve({ width: video.videoWidth, height: video.videoHeight });
      };
      video.onerror = reject;
      video.src = URL.createObjectURL(file);
    });
  }

  /**
   * Loads the dimensions of an image file – for PNG's we parse the pHYs chunk to get the
   * "real" dimensions of a retina image, for SVG's we parse the width/height or viewBox
   * attributes, for other formats we use an Image element.
   *
   * @param file The file to load the dimensions for
   * @returns The dimensions of the image, if known.
   */
  static async getImageDimensions(
    file: File
  ): Promise<{ width: number; height: number } | undefined> {
    function parsePhys(view: DataView) {
      return {
        ppux: view.getUint32(0),
        ppuy: view.getUint32(4),
        unit: view.getUint8(4),
      };
    }

    function parseIHDR(view: DataView) {
      return {
        width: view.getUint32(0),
        height: view.getUint32(4),
      };
    }

    if (file.type === "image/png") {
      try {
        const buffer = await file.arrayBuffer();
        const chunks = extract(new Uint8Array(buffer));
        const pHYsChunk = chunks.find((chunk) => chunk.name === "pHYs");
        const iHDRChunk = chunks.find((chunk) => chunk.name === "IHDR");

        if (pHYsChunk && iHDRChunk) {
          const idhrData = parseIHDR(new DataView(iHDRChunk.data.buffer));
          const physData = parsePhys(new DataView(pHYsChunk.data.buffer));

          if (physData.unit === 0 && physData.ppux === physData.ppuy) {
            const pixelRatio = Math.round(physData.ppux / 2834.5);
            return {
              width: idhrData.width / pixelRatio,
              height: idhrData.height / pixelRatio,
            };
          }
        }
      } catch (_e) {
        // Fallback to loading from image
      }
    }

    if (file.type === "image/svg+xml") {
      try {
        const text = await file.text();
        const dimensions = this.parseSvgDimensions(text);
        if (dimensions) {
          return dimensions;
        }
      } catch (_e) {
        // Fallback to loading from image
      }
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = function () {
        window.URL.revokeObjectURL(img.src);
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Parses SVG dimensions from the width/height attributes or viewBox.
   *
   * @param svgText The SVG content as a string
   * @returns The dimensions if found, undefined otherwise
   */
  private static parseSvgDimensions(
    svgText: string
  ): { width: number; height: number } | undefined {
    // Try to parse width/height attributes first
    const widthMatch = svgText.match(/\bwidth=["'](\d+(?:\.\d+)?)(px)?["']/);
    const heightMatch = svgText.match(/\bheight=["'](\d+(?:\.\d+)?)(px)?["']/);

    if (widthMatch && heightMatch) {
      const width = parseFloat(widthMatch[1]);
      const height = parseFloat(heightMatch[1]);
      if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
        return { width, height };
      }
    }

    // Fall back to viewBox
    const viewBoxMatch = svgText.match(
      /\bviewBox=["'][\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)["']/
    );
    if (viewBoxMatch) {
      const width = parseFloat(viewBoxMatch[1]);
      const height = parseFloat(viewBoxMatch[2]);
      if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
        return { width, height };
      }
    }

    return undefined;
  }

  /**
   * Determines the source of an image file, if known.
   *
   * @param file The image file to check
   * @returns The image source, or undefined if unknown
   */
  static async getImageSourceAttr(
    file: File
  ): Promise<ImageSource | undefined> {
    if (await this.isDiagramsNetImage(file)) {
      return ImageSource.DiagramsNet;
    }
    return undefined;
  }

  /**
   * Checks if a file contains embedded Draw.io/Diagrams.net data.
   * Supports both PNG and SVG formats.
   *
   * @param file The image file to check
   * @returns True if the file contains Draw.io/Diagrams.net data
   */
  private static async isDiagramsNetImage(file: File): Promise<boolean> {
    if (file.type === "image/svg+xml") {
      return this.isDiagramsNetSvg(file);
    }
    if (file.type === "image/png") {
      return this.isDiagramsNetPng(file);
    }
    return false;
  }

  /**
   * Checks if an SVG file contains embedded Draw.io/Diagrams.net data.
   * Diagrams.net embeds the mxfile XML in a "content" attribute on the SVG root element.
   *
   * @param file The SVG file to check
   * @returns True if the file contains Draw.io/Diagrams.net data
   */
  private static async isDiagramsNetSvg(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      // Check for mxfile content attribute (URL-encoded) or embedded mxfile element
      return (
        text.includes('content="%3Cmxfile') ||
        text.includes("content='%3Cmxfile") ||
        text.includes("<mxfile")
      );
    } catch (_err) {
      return false;
    }
  }

  /**
   * Reads a PNG file and detects if it contains embedded Draw.io/Diagrams.net data.
   *
   * @param file The PNG file to check
   * @returns True if the file contains Draw.io/Diagrams.net data
   */
  private static async isDiagramsNetPng(file: File): Promise<boolean> {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Validate PNG signature
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (!pngSignature.every((b, i) => bytes[i] === b)) {
      return false;
    }

    let pos = 8; // skip PNG header

    while (pos < bytes.length) {
      // Read chunk length and type
      const length =
        (bytes[pos] << 24) |
        (bytes[pos + 1] << 16) |
        (bytes[pos + 2] << 8) |
        bytes[pos + 3];
      const type = String.fromCharCode(...bytes.slice(pos + 4, pos + 8));
      const data = bytes.slice(pos + 8, pos + 8 + length);
      pos += 12 + length; // advance to next chunk

      // Check for text chunks where Draw.io embeds metadata
      if (type === "tEXt" || type === "zTXt" || type === "iTXt") {
        const nullIndex = data.indexOf(0);
        if (nullIndex < 0) {
          continue;
        }
        const keyword = new TextDecoder().decode(data.slice(0, nullIndex));

        if (keyword.includes("mxfile")) {
          try {
            let textContent: string;

            if (type === "tEXt") {
              // tEXt: keyword + null + uncompressed text
              textContent = new TextDecoder().decode(data.slice(nullIndex + 1));
            } else if (type === "zTXt") {
              // zTXt: keyword + null + compression method + compressed text
              const compressionMethod = data[nullIndex + 1];
              if (compressionMethod === 0) {
                // 0 = deflate compression
                const compressed = data.slice(nullIndex + 2);
                textContent = inflate(compressed, { to: "string" });
              } else {
                continue; // Unsupported compression method
              }
            } else {
              // iTXt
              // iTXt: keyword + null + compression flag + compression method + language tag + null + translated keyword + null + text
              const compressionFlag = data[nullIndex + 1];
              if (compressionFlag === 0) {
                // Uncompressed iTXt
                let pos = nullIndex + 3; // Skip null, compression flag, and compression method
                // Skip language tag
                while (pos < data.length && data[pos] !== 0) {
                  pos++;
                }
                pos++; // Skip null after language tag
                // Skip translated keyword
                while (pos < data.length && data[pos] !== 0) {
                  pos++;
                }
                pos++; // Skip null after translated keyword
                textContent = new TextDecoder().decode(data.slice(pos));
              } else if (compressionFlag === 1) {
                // Compressed iTXt
                let pos = nullIndex + 3; // Skip null, compression flag, and compression method
                // Skip language tag
                while (pos < data.length && data[pos] !== 0) {
                  pos++;
                }
                pos++; // Skip null after language tag
                // Skip translated keyword
                while (pos < data.length && data[pos] !== 0) {
                  pos++;
                }
                pos++; // Skip null after translated keyword
                const compressed = data.slice(pos);
                textContent = inflate(compressed, { to: "string" });
              } else {
                continue; // Invalid compression flag
              }
            }

            if (textContent.includes("%3Cmxfile")) {
              return true;
            }
          } catch (_err) {
            // Ignore decompression errors and continue
          }
        }
      }
    }

    return false;
  }

  /**
   * Converts an image URL to a base64 data URI string.
   *
   * @param url - the URL of the image to convert.
   * @returns promise resolving to a data URI string.
   * @throws Error if the image cannot be fetched or converted.
   */
  static async urlToBase64(url: string): Promise<string> {
    // Use "no-store" to skip the HTTP cache entirely. Without this, the
    // browser may reuse a cached response that was originally fetched by an
    // <img> tag (which omits the Origin header). S3/CloudFront can cache
    // that response without Access-Control-Allow-Origin, causing a CORS
    // error when fetch later tries to read the same URL with an Origin
    // header.
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        reject(new Error("Failed to read image as base64"));
      };
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Converts base64 encoded data to a File object.
   *
   * @param base64Data - base64 encoded string, optionally with data URI prefix.
   * @param filename - name for the file.
   * @param mimeType - MIME type for the file.
   * @returns File object containing the decoded data.
   */
  static base64ToFile(
    base64Data: string,
    filename: string,
    mimeType: string
  ): File {
    // Extract base64 portion if it includes data URI prefix
    const base64 = base64Data.includes(",")
      ? base64Data.split(",")[1]
      : base64Data;

    // Decode base64 to binary
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new File([bytes], filename, { type: mimeType });
  }
}
