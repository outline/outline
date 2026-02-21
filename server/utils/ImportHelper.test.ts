import path from "node:path";
import fs from "fs-extra";
import { tmpdir } from "node:os";
import ImportHelper from "./ImportHelper";

describe("ImportHelper", () => {
  describe("toFileTree", () => {
    let tempDir: string;

    beforeEach(async () => {
      // Create a unique temporary directory for each test
      tempDir = await fs.mkdtemp(path.join(tmpdir(), "import-helper-test-"));
    });

    afterEach(async () => {
      // Clean up the temporary directory after each test
      await fs.remove(tempDir);
    });

    it("should filter out hidden files starting with dot", async () => {
      // Create test file structure
      await fs.writeFile(path.join(tempDir, "visible-file.txt"), "content");
      await fs.writeFile(path.join(tempDir, ".hidden-file.txt"), "content");
      await fs.writeFile(path.join(tempDir, "another-file.md"), "content");
      await fs.writeFile(path.join(tempDir, ".DS_Store"), "content");

      const result = await ImportHelper.toFileTree(tempDir);

      expect(result).not.toBeNull();
      expect(result!.children).toHaveLength(2);

      const childNames = result!.children.map((child) => child.name);
      expect(childNames).toContain("visible-file.txt");
      expect(childNames).toContain("another-file.md");
      expect(childNames).not.toContain(".hidden-file.txt");
      expect(childNames).not.toContain(".DS_Store");
    });

    it("should filter out __MACOSX directories", async () => {
      // Create test directory structure
      await fs.ensureDir(path.join(tempDir, "normal-folder"));
      await fs.ensureDir(path.join(tempDir, "__MACOSX"));
      await fs.writeFile(
        path.join(tempDir, "normal-folder", "file.txt"),
        "content"
      );
      await fs.writeFile(path.join(tempDir, "__MACOSX", "metadata"), "content");

      const result = await ImportHelper.toFileTree(tempDir);

      expect(result).not.toBeNull();
      expect(result!.children).toHaveLength(1);
      expect(result!.children[0].name).toBe("normal-folder");
    });

    it("should filter hidden files in nested directories", async () => {
      // Create nested directory structure with hidden files
      await fs.ensureDir(path.join(tempDir, "folder1", "subfolder"));
      await fs.writeFile(
        path.join(tempDir, "folder1", "visible.txt"),
        "content"
      );
      await fs.writeFile(
        path.join(tempDir, "folder1", ".hidden.txt"),
        "content"
      );
      await fs.writeFile(
        path.join(tempDir, "folder1", "subfolder", "nested.txt"),
        "content"
      );
      await fs.writeFile(
        path.join(tempDir, "folder1", "subfolder", ".nested-hidden.txt"),
        "content"
      );

      const result = await ImportHelper.toFileTree(tempDir);

      expect(result).not.toBeNull();
      expect(result!.children).toHaveLength(1);

      const folder1 = result!.children[0];
      expect(folder1.name).toBe("folder1");
      expect(folder1.children).toHaveLength(2); // visible.txt and subfolder

      const visibleFiles = folder1.children.filter(
        (child) => child.name !== "subfolder"
      );
      expect(visibleFiles).toHaveLength(1);
      expect(visibleFiles[0].name).toBe("visible.txt");

      const subfolder = folder1.children.find(
        (child) => child.name === "subfolder"
      );
      expect(subfolder).toBeDefined();
      expect(subfolder!.children).toHaveLength(1);
      expect(subfolder!.children[0].name).toBe("nested.txt");
    });

    it("should handle directories with only hidden files", async () => {
      // Create directory with only hidden files
      await fs.ensureDir(path.join(tempDir, "empty-looking-folder"));
      await fs.writeFile(
        path.join(tempDir, "empty-looking-folder", ".hidden1"),
        "content"
      );
      await fs.writeFile(
        path.join(tempDir, "empty-looking-folder", ".hidden2"),
        "content"
      );

      const result = await ImportHelper.toFileTree(tempDir);

      expect(result).not.toBeNull();
      expect(result!.children).toHaveLength(1);

      const folder = result!.children[0];
      expect(folder.name).toBe("empty-looking-folder");
      expect(folder.children).toHaveLength(0); // All children are hidden
    });

    it("should correctly set title from deserialized filename", async () => {
      // Create files with special characters that would be serialized
      await fs.writeFile(path.join(tempDir, "normal-file.txt"), "content");

      const result = await ImportHelper.toFileTree(tempDir);

      expect(result).not.toBeNull();
      expect(result!.children).toHaveLength(1);
      expect(result!.children[0].name).toBe("normal-file.txt");
      expect(result!.children[0].title).toBe("normal-file");
    });

    it("should return null for non-existent paths", async () => {
      const nonExistentPath = path.join(tempDir, "does-not-exist");
      const result = await ImportHelper.toFileTree(nonExistentPath);
      expect(result).toBeNull();
    });

    it("should handle empty directories", async () => {
      const result = await ImportHelper.toFileTree(tempDir);

      expect(result).not.toBeNull();
      expect(result!.children).toHaveLength(0);
      expect(result!.name).toBe(path.basename(tempDir));
    });

    it("should handle mixed file types and hidden files", async () => {
      // Create a complex structure with various file types and hidden files
      await fs.writeFile(path.join(tempDir, "document.pdf"), "content");
      await fs.writeFile(path.join(tempDir, "image.jpg"), "content");
      await fs.writeFile(path.join(tempDir, ".gitignore"), "content");
      await fs.writeFile(path.join(tempDir, "readme.md"), "content");
      await fs.ensureDir(path.join(tempDir, ".git"));
      await fs.ensureDir(path.join(tempDir, "assets"));
      await fs.writeFile(path.join(tempDir, ".git", "config"), "content");
      await fs.writeFile(path.join(tempDir, "assets", "style.css"), "content");

      const result = await ImportHelper.toFileTree(tempDir);

      expect(result).not.toBeNull();
      expect(result!.children).toHaveLength(4); // document.pdf, image.jpg, readme.md, assets

      const childNames = result!.children.map((child) => child.name);
      expect(childNames).toContain("document.pdf");
      expect(childNames).toContain("image.jpg");
      expect(childNames).toContain("readme.md");
      expect(childNames).toContain("assets");
      expect(childNames).not.toContain(".gitignore");
      expect(childNames).not.toContain(".git");

      const assetsFolder = result!.children.find(
        (child) => child.name === "assets"
      );
      expect(assetsFolder).toBeDefined();
      expect(assetsFolder!.children).toHaveLength(1);
      expect(assetsFolder!.children[0].name).toBe("style.css");
    });
  });
});
