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
   * Loads the poster of a video file.
   *
   * @param file The file to load the poster for
   * @returns The poster of the video as a url
   */
  static getVideoPoster(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.poster);
      };
      video.onerror = reject;
      video.src = URL.createObjectURL(file);
    });
  }
}
