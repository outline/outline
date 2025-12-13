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
   * "real" dimensions of a retina image, for other formats we use an Image element.
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
   * Reads a PNG file (as ArrayBuffer) and detects if it contains embedded Draw.io/Diagrams.net data.
   *
   * @param file The PNG file to check
   * @returns True if the file contains Draw.io/Diagrams.net data
   */
  private static async isDiagramsNetImage(file: File): Promise<boolean> {
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
   * Converts an image URL to base64 encoded data.
   *
   * @param url - the URL of the image to convert.
   * @returns promise resolving to base64 string (without data URI prefix).
   * @throws Error if the image cannot be fetched or converted.
   */
  static async urlToBase64(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        // Extract just the base64 portion (remove "data:image/png;base64," prefix)
        const base64 = base64data.split(",")[1];
        resolve(base64);
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
