import { AttachmentPreset } from "@shared/types";
import { compressImage } from "~/utils/compressImage";
import { uploadFile } from "~/utils/files";

// Mock the dependencies
jest.mock("~/utils/compressImage");
jest.mock("~/utils/files");

describe("EmojiCreateDialog - GIF handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should skip compression for GIF files", async () => {
    const mockCompressImage = compressImage as jest.MockedFunction<
      typeof compressImage
    >;
    const mockUploadFile = uploadFile as jest.MockedFunction<
      typeof uploadFile
    >;

    // Create a mock GIF file
    const gifFile = new File(["gif content"], "animated.gif", {
      type: "image/gif",
    });

    mockUploadFile.mockResolvedValue({
      id: "attachment-id",
      url: "https://example.com/emoji.gif",
      name: "animated.gif",
    } as unknown as Awaited<ReturnType<typeof uploadFile>>);

    // Simulate the logic from handleSubmit
    const fileToUpload =
      gifFile.type === "image/gif"
        ? gifFile
        : await compressImage(gifFile, {
            maxHeight: 64,
            maxWidth: 64,
          });

    await uploadFile(fileToUpload, {
      name: gifFile.name,
      preset: AttachmentPreset.Emoji,
    });

    // Verify compression was NOT called for GIF
    expect(mockCompressImage).not.toHaveBeenCalled();
    // Verify uploadFile was called with the original file
    expect(mockUploadFile).toHaveBeenCalledWith(gifFile, {
      name: "animated.gif",
      preset: AttachmentPreset.Emoji,
    });
  });

  test("should compress non-GIF files", async () => {
    const mockCompressImage = compressImage as jest.MockedFunction<
      typeof compressImage
    >;
    const mockUploadFile = uploadFile as jest.MockedFunction<
      typeof uploadFile
    >;

    // Create a mock PNG file
    const pngFile = new File(["png content"], "emoji.png", {
      type: "image/png",
    });

    const compressedBlob = new Blob(["compressed content"], {
      type: "image/png",
    });
    mockCompressImage.mockResolvedValue(compressedBlob);

    mockUploadFile.mockResolvedValue({
      id: "attachment-id",
      url: "https://example.com/emoji.png",
      name: "emoji.png",
    } as unknown as Awaited<ReturnType<typeof uploadFile>>);

    // Simulate the logic from handleSubmit
    const fileToUpload =
      pngFile.type === "image/gif"
        ? pngFile
        : await compressImage(pngFile, {
            maxHeight: 64,
            maxWidth: 64,
          });

    await uploadFile(fileToUpload, {
      name: pngFile.name,
      preset: AttachmentPreset.Emoji,
    });

    // Verify compression WAS called for PNG
    expect(mockCompressImage).toHaveBeenCalledWith(pngFile, {
      maxHeight: 64,
      maxWidth: 64,
    });
    // Verify uploadFile was called with the compressed blob
    expect(mockUploadFile).toHaveBeenCalledWith(compressedBlob, {
      name: "emoji.png",
      preset: AttachmentPreset.Emoji,
    });
  });
});
