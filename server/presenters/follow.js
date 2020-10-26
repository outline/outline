import { Follow } from "../models"

export default function present(follow: Follow) {
    const data = {
        id: follow.id,
        requestedDocId: follow.requestedDocId,
        userId: follow.userId,
        createdAt: follow.createdAt,
        updatedAt: follow.updatedAt,
    };

    return data;
}