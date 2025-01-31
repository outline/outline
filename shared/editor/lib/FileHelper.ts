import extract from "png-chunks-extract";

export default class FileHelper {
  /**
   * Checks if a file is an image.
   *
   * @param file The file to check
   * @returns True if the file is an image
   */
  static isImage(file: File) {
    return file.type.startsWith("image/");
  }

  /**
   * Checks if a file is a video.
   *
   * @param file The file to check
   * @returns True if the file is an video
   */
  static isVideo(file: File) {
    return file.type.startsWith("video/");
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

        if (!pHYsChunk || !iHDRChunk) {
          return;
        }

        const idhrData = parseIHDR(new DataView(iHDRChunk.data.buffer));
        const physData = parsePhys(new DataView(pHYsChunk.data.buffer));

        if (physData.unit === 0 && physData.ppux === physData.ppuy) {
          const pixelRatio = Math.round(physData.ppux / 2834.5);
          return {
            width: idhrData.width / pixelRatio,
            height: idhrData.height / pixelRatio,
          };
        }
      } catch (_e) {
        return undefined;
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
}
