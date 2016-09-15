# Atlas API

_Our API is currently in beta and we might make minor adjustments._

## Making requests

Atlas' API follows JSON RPC style conventions where each API endpoint is a method on `https://www.beautifulatlas.com/api/<METHOD>`. Each request needs to be made using HTTPS and both `GET` and `POST` (recommended) methods are supported.

For `GET` requests query string parameters are expected (e.g. `/api/document.info?id=...&token=...`). When making `POST` requests, request parameters are parsed depending on `Content-Type` header. To make a call using JSON payload, one must pass `Content-Type: application/json` header:

```shell
curl 'https://www.beautifulatlas.com/api/documents.info?id=atlas-api-NTpezNwhUP'\
  -H 'authorization: Bearer <API KEY>'\
  -H 'content-type: application/json'\
  -H 'accept: application/json'
```

## Authentication

To access private API endpoints, you must provide a valid API key. You can create new API keys in your [account settings](https://www.beautifulatlas.com/settings). Be careful when handling your keys as they give access to all of your documents.

To authenticate with Atlas API, you can supply the API key as a header (`Authorization: Bearer <API KEY>`) or as part of the payload using `token` parameter.

Some API endpoints allow unauhenticated requests for public resources and they can be called without an API key.

## Errors

All successful API requests will be returned with `200` status code and `ok: true` in the response payload. If there's an error while making the request, appropriate status code is returned with the `error` message:

```json
{
  "ok": false,
  "error: "Not Found"
}
```

## Methods

### `user.info` - Get current user

This method returns the information for currently logged in user.

#### Arguments

`https://www.beautifulatlas.com/api/user.info`

Parameter | Description
------------ | -------------
`token` | Authentication token

---

### `user.s3Upload` - Gets S3 upload credentials

You can upload small files and images as part of your documents. All files are stored using Amazon S3. Instead of uploading files to Atlas, you need to upload them directly to S3 with special credentials which can be obtained through this endpoint.

#### Arguments

`https://www.beautifulatlas.com/api/user.s3Upload`

Parameter | Description
------------ | -------------
`token` | Authentication token
`filename` | Filename of the uploaded file
`kind` | Mimetype of the document
`size` | Filesize of the document

---

### `collections.list` - List your document collections

List all your document collections.

#### Arguments

`https://www.beautifulatlas.com/api/collections.list`

Parameter | Description
------------ | -------------
`token` | Authentication token
`offset` | Pagination offset
`limit` | Pagination limit

---

### `collections.info` - Get a document collection

Returns detailed information on a document collection.

#### Arguments

`https://www.beautifulatlas.com/api/collections.info`

Parameter | Description
------------ | -------------
`token` | Authentication token
`id` | Collection id

---

### `collections.create` - Create a document collection

Creates a new document collection. Atlas supports two types of collections:

- `atlas` - Structured collection with a navigation tree
- `journal` - Chronological collection of documents

#### Arguments

`https://www.beautifulatlas.com/api/collections.create`

Parameter | Description
------------ | -------------
`token` | Authentication token
`name` | Collection name
`type` | Collection type. Allowed values: `atlas`, `journal`
`description` | _(Optional)_ Short description for the collection

---

### `collections.updateNavigationTree` - Organize navigation tree

Collection navigation can be re-organized by sending a modified version of the navigation tree. This method is available for collections with type `atlas`.

#### Arguments

`https://www.beautifulatlas.com/api/collections.updateNavigationTree`

Parameter | Description
------------ | -------------
`token` | Authentication token
`id` | Collection id
`tree` | Modified navigation tree

---

### `documents.info` - Get a document

This method returns information for a document with a specific ID. Following identifiers are allowed:

- UUID - `id` field of the document
- URI identifier - Human readable identifier used in Atlas URLs (e.g. `atlas-api-i48ZEZc5zjXndcP`)

#### Arguments

`https://www.beautifulatlas.com/api/documents.info`

Parameter | Description
------------ | -------------
`token` | Authentication token
`id` | Document id or URI identifier

---

### `documents.search` - Search documents

This methods allows you to search all of your documents with keywords.

#### Arguments

`https://www.beautifulatlas.com/api/documents.search`

Parameter | Description
------------ | -------------
`token` | Authentication token
`query` | Search query

---

### `documents.create` - Create a new document

This method allows you to publish a new document under an existing collection. If your collection is structured `type: atlas` collection, you can also create sub-documents for other documents with optional `parentDocument` parameter.

#### Arguments

`https://www.beautifulatlas.com/api/documents.create`

Parameter | Description
------------ | -------------
`token` | Authentication token
`collection` | `id` of the collection to which the document is created
`title` | Title for the document
`text` | Content of the document in Markdown
`parentDocument` | _(Optional)_ `id` of the parent document within the collection

---

### `documents.delete` - Delete a document

Delete a document and all of its child documents if any.

#### Arguments

`https://www.beautifulatlas.com/api/documents.delete`

Parameter | Description
------------ | -------------
`token` | Authentication token
`id` | Document id or URI identifier
