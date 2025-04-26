import { DocumentHelper } from "../DocumentHelper";
import { Document, Collection } from "@server/models";

describe("DocumentHelper", () => {
    // ... existing tests ...

    describe("getBreadcrumbString", () => {
        it("should return collection name and document title for documents without parents", async () => {
            const collection = await Collection.create({
                name: "Test Collection",
                teamId: "test-team",
            });

            const document = await Document.create({
                title: "Test Document",
                collectionId: collection.id,
                teamId: "test-team",
            });

            const breadcrumb = await DocumentHelper.getBreadcrumbString(document);
            expect(breadcrumb).toBe("Test Collection > Test Document");
        });

        it("should return full path for nested documents", async () => {
            const collection = await Collection.create({
                name: "Test Collection",
                teamId: "test-team",
            });

            const parentDocument = await Document.create({
                title: "Parent Document",
                collectionId: collection.id,
                teamId: "test-team",
            });

            const childDocument = await Document.create({
                title: "Child Document",
                collectionId: collection.id,
                parentDocumentId: parentDocument.id,
                teamId: "test-team",
            });

            const breadcrumb = await DocumentHelper.getBreadcrumbString(childDocument);
            expect(breadcrumb).toBe("Test Collection > Parent Document > Child Document");
        });

        it("should handle missing collections gracefully", async () => {
            const document = await Document.create({
                title: "Test Document",
                teamId: "test-team",
            });

            const breadcrumb = await DocumentHelper.getBreadcrumbString(document);
            expect(breadcrumb).toBe("");
        });
    });
}); 