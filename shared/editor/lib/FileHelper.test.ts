import FileHelper from "./FileHelper";

describe("FileHelper", () => {
  it("isImage", () => {
    expect(FileHelper.isImage("image/png")).toBe(true);
    expect(FileHelper.isImage("image/jpeg")).toBe(true);
    expect(FileHelper.isImage("image/webp")).toBe(true);
    expect(FileHelper.isImage("image/gif")).toBe(true);
    expect(FileHelper.isImage("image/bmp")).toBe(true);
    expect(FileHelper.isImage("image/avif")).toBe(true);
    expect(FileHelper.isImage("image/heif-sequence")).toBe(true);
    expect(FileHelper.isImage("image/svg+xml")).toBe(true);
    expect(FileHelper.isImage("text/plain")).toBe(false);
    expect(FileHelper.isImage("application/json")).toBe(false);
  });

  it("isVideo", () => {
    expect(FileHelper.isVideo("video/mp4")).toBe(true);
    expect(FileHelper.isVideo("video/webm")).toBe(true);
    expect(FileHelper.isVideo("video/x-msvideo")).toBe(true);
    expect(FileHelper.isVideo("video/vnd.dlna.mpeg-tts")).toBe(true);
    expect(FileHelper.isVideo("text/plain")).toBe(false);
    expect(FileHelper.isVideo("application/json")).toBe(false);
  });

  it("isAudio", () => {
    expect(FileHelper.isAudio("audio/mpeg")).toBe(true);
    expect(FileHelper.isAudio("audio/wav")).toBe(true);
    expect(FileHelper.isAudio("audio/vnd.dolby.heaac.1")).toBe(true);
    expect(FileHelper.isAudio("audio/vnd.lucent.voice")).toBe(true);
    expect(FileHelper.isAudio("text/plain")).toBe(false);
    expect(FileHelper.isAudio("application/json")).toBe(false);
  });
});
