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
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve({ width: video.videoWidth, height: video.videoHeight });
      };
      video.onerror = reject;
      video.src = URL.createObjectURL(file);
    });
  }

  /**
   * Returns a thumbnail for a given video file.
   *
   * @param file The file to load the thumbnail for
   * @returns A promise resolving to the thumbnail of the video as a png data uri
   */
  static async getVideoThumbnail(file: File) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const video = document.createElement("video");

      // this is important
      video.autoplay = true;
      video.muted = true;
      video.src = URL.createObjectURL(file);

      video.onloadeddata = () => {
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return reject("No canvas available");
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        video.pause();
        return resolve(canvas.toDataURL("image/png"));
      };
    });
  }
}
