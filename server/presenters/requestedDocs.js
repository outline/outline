import { RequestedDoc } from "../models";

export default function present(requestedDocs: RequestedDoc) {
    const data = {
        id: requestedDocs.id,
        title: requestedDocs.title,
        collectionId: requestedDocs.collectionId,
        like: requestedDocs.like,
        userId: requestedDocs.userId,
        createdAt: requestedDocs.createdAt,
        updatedAt: requestedDocs.updatedAt,
    };

    return data;
}