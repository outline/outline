import Router from "koa-router";
import { InvalidRequestError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { Document, Relationship } from "@server/models";
import { authorize } from "@server/policies";
import {
  presentRelationship,
  presentDocuments,
  presentPolicies,
} from "@server/presenters";
import type { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "relationships.info",
  auth(),
  validate(T.RelationshipsInfoSchema),
  async (ctx: APIContext<T.RelationshipsInfoReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;

    const relationship = await Relationship.findByPk(id, {
      rejectOnEmpty: true,
    });
    const document = await Document.findByPk(relationship.documentId, {
      userId: user.id,
      rejectOnEmpty: true,
    });
    authorize(user, "read", document);

    const reverseDocument = await Document.findByPk(
      relationship.reverseDocumentId,
      {
        userId: user.id,
        rejectOnEmpty: true,
      }
    );
    authorize(user, "read", reverseDocument);

    const documents = [document, reverseDocument];

    ctx.body = {
      data: {
        relationship: presentRelationship(relationship),
        documents: await presentDocuments(ctx, documents),
      },
      policies: presentPolicies(user, documents),
    };
  }
);

router.post(
  "relationships.list",
  auth(),
  pagination(),
  validate(T.RelationshipsListSchema),
  async (ctx: APIContext<T.RelationshipsListReq>) => {
    const { type, documentId, reverseDocumentId } = ctx.input.body;
    const { user } = ctx.state.auth;

    // Results are anchored to a single document, which the user must be able to
    // read. Documents on the opposite side of each relationship are filtered by
    // access below.
    const anchorId = documentId ?? reverseDocumentId;
    if (!anchorId) {
      throw InvalidRequestError(
        "One of documentId or reverseDocumentId is required"
      );
    }

    const anchorDocument = await Document.findByPk(anchorId, {
      userId: user.id,
      rejectOnEmpty: true,
    });
    authorize(user, "read", anchorDocument);

    const relationships = await Relationship.findAll({
      where: {
        ...(type ? { type } : {}),
        ...(documentId
          ? { documentId: anchorDocument.id }
          : { reverseDocumentId: anchorDocument.id }),
      },
      order: [["createdAt", "DESC"]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    const relatedDocumentId = (relationship: Relationship) =>
      documentId ? relationship.reverseDocumentId : relationship.documentId;

    const documents = await Document.findByIds(
      relationships.map(relatedDocumentId),
      { userId: user.id }
    );

    const documentIds = new Set(documents.map((d) => d.id));
    const filteredRelationships = relationships.filter((relationship) =>
      documentIds.has(relatedDocumentId(relationship))
    );

    ctx.body = {
      pagination: ctx.state.pagination,
      data: {
        relationships: filteredRelationships.map(presentRelationship),
        documents: await presentDocuments(ctx, documents),
      },
      policies: presentPolicies(user, [...documents, ...filteredRelationships]),
    };
  }
);

export default router;
