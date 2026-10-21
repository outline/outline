--
-- Name: pg_trgm; Type: EXTENSION
--

CREATE EXTENSION IF NOT EXISTS pg_trgm;

--
-- Name: unaccent; Type: EXTENSION
--

CREATE EXTENSION IF NOT EXISTS unaccent;

--
-- Name: uuid-ossp; Type: EXTENSION
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--
-- Name: enum_file_operations_state; Type: TYPE
--

CREATE TYPE enum_file_operations_state AS ENUM (
    'creating',
    'uploading',
    'complete',
    'error',
    'expired'
);

--
-- Name: enum_file_operations_type; Type: TYPE
--

CREATE TYPE enum_file_operations_type AS ENUM (
    'import',
    'export'
);

--
-- Name: enum_group_users_permission; Type: TYPE
--

CREATE TYPE enum_group_users_permission AS ENUM (
    'admin',
    'member'
);

--
-- Name: enum_relationships_type; Type: TYPE
--

CREATE TYPE enum_relationships_type AS ENUM (
    'backlink',
    'similar'
);

--
-- Name: enum_search_queries_source; Type: TYPE
--

CREATE TYPE enum_search_queries_source AS ENUM (
    'slack',
    'app',
    'api',
    'oauth'
);

--
-- Name: enum_users_role; Type: TYPE
--

CREATE TYPE enum_users_role AS ENUM (
    'admin',
    'member',
    'viewer',
    'guest'
);

--
-- Name: atlases_search_trigger(); Type: FUNCTION
--

CREATE FUNCTION atlases_search_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new."searchVector" :=
    setweight(to_tsvector('english', coalesce(new.name, '')),'A') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'C');
  return new;
end
$$;

--
-- Name: documents_search_trigger(); Type: FUNCTION
--

CREATE FUNCTION documents_search_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    begin
      new."searchVector" :=
        setweight(to_tsvector('english', coalesce(new.title, '')),'A') ||
        setweight(to_tsvector('english', coalesce(array_to_string(new."previousTitles", ' , '),'')),'C') ||
        setweight(to_tsvector('english', substring(coalesce(new.text, ''), 1, 1000000)), 'D');
      return new;
    end
    $$;

--
-- Name: apiKeys; Type: TABLE
--

CREATE TABLE "apiKeys" (
    id uuid NOT NULL,
    name character varying,
    secret character varying(255),
    "userId" uuid,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "deletedAt" timestamp with time zone,
    "expiresAt" timestamp with time zone,
    "lastActiveAt" timestamp with time zone,
    hash character varying(255),
    last4 character varying(4),
    scope character varying(255)[]
);

--
-- Name: attachments; Type: TABLE
--

CREATE TABLE attachments (
    id uuid NOT NULL,
    "teamId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "documentId" uuid,
    key character varying(4096) NOT NULL,
    "contentType" character varying(255) NOT NULL,
    size bigint NOT NULL,
    acl character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "lastAccessedAt" timestamp with time zone,
    "expiresAt" timestamp with time zone
);

--
-- Name: authentication_providers; Type: TABLE
--

CREATE TABLE authentication_providers (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    "providerId" character varying(255) NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "teamId" uuid NOT NULL,
    "createdAt" timestamp with time zone NOT NULL
);

--
-- Name: authentications; Type: TABLE
--

CREATE TABLE authentications (
    id uuid NOT NULL,
    "userId" uuid,
    "teamId" uuid,
    service character varying(255) CONSTRAINT "authentications_serviceId_not_null" NOT NULL,
    token bytea,
    scopes character varying(255)[],
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "refreshToken" bytea,
    "expiresAt" timestamp with time zone
);

--
-- Name: relationships; Type: TABLE
--

CREATE TABLE relationships (
    id uuid CONSTRAINT backlinks_id_not_null NOT NULL,
    "userId" uuid CONSTRAINT "backlinks_userId_not_null" NOT NULL,
    "documentId" uuid CONSTRAINT "backlinks_documentId_not_null" NOT NULL,
    "reverseDocumentId" uuid CONSTRAINT "backlinks_reverseDocumentId_not_null" NOT NULL,
    "createdAt" timestamp with time zone CONSTRAINT "backlinks_createdAt_not_null" NOT NULL,
    "updatedAt" timestamp with time zone CONSTRAINT "backlinks_updatedAt_not_null" NOT NULL,
    type enum_relationships_type DEFAULT 'backlink'::enum_relationships_type NOT NULL
);

--
-- Name: backlinks; Type: VIEW
--

CREATE VIEW backlinks AS
 SELECT id,
    "userId",
    "documentId",
    "reverseDocumentId",
    "createdAt",
    "updatedAt"
   FROM relationships
  WHERE (type = 'backlink'::enum_relationships_type);

--
-- Name: group_permissions; Type: TABLE
--

CREATE TABLE group_permissions (
    "collectionId" uuid,
    "groupId" uuid CONSTRAINT "collection_groups_groupId_not_null" NOT NULL,
    "createdById" uuid CONSTRAINT "collection_groups_createdById_not_null" NOT NULL,
    permission character varying(255) CONSTRAINT collection_groups_permission_not_null NOT NULL,
    "createdAt" timestamp with time zone CONSTRAINT "collection_groups_createdAt_not_null" NOT NULL,
    "updatedAt" timestamp with time zone CONSTRAINT "collection_groups_updatedAt_not_null" NOT NULL,
    "deletedAt" timestamp with time zone,
    "documentId" uuid,
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    "sourceId" uuid
);

--
-- Name: collection_groups; Type: VIEW
--

CREATE VIEW collection_groups AS
 SELECT "collectionId",
    "groupId",
    "createdById",
    permission,
    "createdAt",
    "updatedAt",
    "deletedAt",
    "documentId"
   FROM group_permissions;

--
-- Name: user_permissions; Type: TABLE
--

CREATE TABLE user_permissions (
    "collectionId" uuid,
    "userId" uuid CONSTRAINT "collection_users_userId_not_null" NOT NULL,
    permission character varying(255) DEFAULT 'read_write'::character varying CONSTRAINT collection_users_permission_not_null NOT NULL,
    "createdById" uuid CONSTRAINT "collection_users_createdById_not_null" NOT NULL,
    "createdAt" timestamp with time zone CONSTRAINT "collection_users_createdAt_not_null" NOT NULL,
    "updatedAt" timestamp with time zone CONSTRAINT "collection_users_updatedAt_not_null" NOT NULL,
    "documentId" uuid,
    index character varying(255),
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    "sourceId" uuid
);

--
-- Name: collection_users; Type: VIEW
--

CREATE VIEW collection_users AS
 SELECT "collectionId",
    "userId",
    permission,
    "createdById",
    "createdAt",
    "updatedAt",
    "documentId"
   FROM user_permissions;

--
-- Name: collections; Type: TABLE
--

CREATE TABLE collections (
    id uuid CONSTRAINT atlases_id_not_null NOT NULL,
    name character varying,
    description character varying,
    "createdAt" timestamp with time zone CONSTRAINT "atlases_createdAt_not_null" NOT NULL,
    "updatedAt" timestamp with time zone CONSTRAINT "atlases_updatedAt_not_null" NOT NULL,
    "teamId" uuid CONSTRAINT "atlases_teamId_not_null" NOT NULL,
    "searchVector" tsvector,
    "createdById" uuid,
    "deletedAt" timestamp with time zone,
    "urlId" character varying(255),
    "documentStructure" jsonb,
    color text,
    "maintainerApprovalRequired" boolean DEFAULT false NOT NULL,
    icon text,
    sort jsonb,
    sharing boolean DEFAULT true NOT NULL,
    index text,
    permission character varying(255) DEFAULT NULL::character varying,
    state bytea,
    "importId" uuid,
    content jsonb,
    "archivedAt" timestamp with time zone,
    "archivedById" uuid,
    "apiImportId" uuid,
    commenting boolean,
    "sourceMetadata" jsonb
);

--
-- Name: comments; Type: TABLE
--

CREATE TABLE comments (
    id uuid NOT NULL,
    data jsonb NOT NULL,
    "documentId" uuid NOT NULL,
    "parentCommentId" uuid,
    "createdById" uuid NOT NULL,
    "resolvedAt" timestamp with time zone,
    "resolvedById" uuid,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "deletedAt" timestamp with time zone,
    reactions jsonb
);

--
-- Name: documents; Type: TABLE
--

CREATE TABLE documents (
    id uuid NOT NULL,
    "urlId" character varying NOT NULL,
    title character varying NOT NULL,
    text text,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "collectionId" uuid,
    "teamId" uuid,
    "parentDocumentId" uuid,
    "lastModifiedById" uuid NOT NULL,
    "revisionCount" integer DEFAULT 0,
    "searchVector" tsvector,
    "deletedAt" timestamp with time zone,
    "createdById" uuid,
    "collaboratorIds" uuid[],
    "publishedAt" timestamp with time zone,
    "pinnedById" uuid,
    "archivedAt" timestamp with time zone,
    "isWelcome" boolean DEFAULT false NOT NULL,
    "editorVersion" character varying(255),
    version smallint,
    template boolean DEFAULT false NOT NULL,
    "templateId" uuid,
    "previousTitles" character varying(255)[],
    state bytea,
    "fullWidth" boolean DEFAULT false NOT NULL,
    "importId" uuid,
    "insightsEnabled" boolean DEFAULT true NOT NULL,
    "sourceMetadata" jsonb,
    content jsonb,
    summary text,
    icon character varying(255),
    color character varying(255),
    "apiImportId" uuid,
    language character varying(2),
    "popularityScore" double precision DEFAULT '0'::double precision NOT NULL
);

--
-- Name: emojis; Type: TABLE
--

CREATE TABLE emojis (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    "attachmentId" uuid NOT NULL,
    "teamId" uuid NOT NULL,
    "createdById" uuid NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);

--
-- Name: events; Type: TABLE
--

CREATE TABLE events (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    data jsonb,
    "userId" uuid,
    "collectionId" uuid,
    "teamId" uuid,
    "createdAt" timestamp with time zone NOT NULL,
    "documentId" uuid,
    "actorId" uuid,
    "modelId" uuid,
    ip character varying(255),
    changes jsonb,
    "authType" character varying(255)
);

--
-- Name: file_operations; Type: TABLE
--

CREATE TABLE file_operations (
    id uuid NOT NULL,
    state enum_file_operations_state NOT NULL,
    type enum_file_operations_type NOT NULL,
    key character varying(255),
    url character varying(255),
    size bigint NOT NULL,
    "userId" uuid NOT NULL,
    "collectionId" uuid,
    "teamId" uuid NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    error character varying(255),
    format character varying(255) DEFAULT 'outline-markdown'::character varying NOT NULL,
    "includeAttachments" boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp with time zone,
    options jsonb,
    "documentId" uuid
);

--
-- Name: group_users; Type: TABLE
--

CREATE TABLE group_users (
    "userId" uuid NOT NULL,
    "groupId" uuid NOT NULL,
    "createdById" uuid NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    permission enum_group_users_permission DEFAULT 'member'::enum_group_users_permission NOT NULL
);

--
-- Name: groups; Type: TABLE
--

CREATE TABLE groups (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    "teamId" uuid NOT NULL,
    "createdById" uuid NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "deletedAt" timestamp with time zone,
    "externalId" character varying(255),
    "disableMentions" boolean DEFAULT false NOT NULL,
    description text
);

--
-- Name: import_tasks; Type: TABLE
--

CREATE TABLE import_tasks (
    id uuid NOT NULL,
    state character varying(255) NOT NULL,
    input jsonb NOT NULL,
    output jsonb,
    "importId" uuid NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    error character varying(255)
);

--
-- Name: imports; Type: TABLE
--

CREATE TABLE imports (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    service character varying(255) NOT NULL,
    state character varying(255) NOT NULL,
    input jsonb NOT NULL,
    "documentCount" integer DEFAULT 0 NOT NULL,
    "integrationId" uuid NOT NULL,
    "createdById" uuid NOT NULL,
    "teamId" uuid NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "deletedAt" timestamp with time zone,
    error character varying(255)
);

--
-- Name: integrations; Type: TABLE
--

CREATE TABLE integrations (
    id uuid NOT NULL,
    type character varying(255),
    "userId" uuid,
    "teamId" uuid NOT NULL,
    service character varying(255) CONSTRAINT "integrations_serviceId_not_null" NOT NULL,
    "collectionId" uuid,
    "authenticationId" uuid,
    events character varying(255)[],
    settings jsonb,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "deletedAt" timestamp with time zone,
    "issueSources" jsonb
);

--
-- Name: notifications; Type: TABLE
--

CREATE TABLE notifications (
    id uuid NOT NULL,
    "actorId" uuid,
    "userId" uuid NOT NULL,
    event character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "viewedAt" timestamp with time zone,
    "emailedAt" timestamp with time zone,
    "teamId" uuid NOT NULL,
    "documentId" uuid,
    "commentId" uuid,
    "revisionId" uuid,
    "collectionId" uuid,
    "archivedAt" timestamp with time zone,
    "membershipId" uuid,
    data json,
    "groupId" uuid
);

--
-- Name: oauth_authentications; Type: TABLE
--

CREATE TABLE oauth_authentications (
    id uuid NOT NULL,
    "accessTokenHash" character varying(255) NOT NULL,
    "accessTokenExpiresAt" timestamp with time zone NOT NULL,
    "refreshTokenHash" character varying(255) NOT NULL,
    "refreshTokenExpiresAt" timestamp with time zone NOT NULL,
    "lastActiveAt" timestamp with time zone,
    scope character varying(255)[] NOT NULL,
    "oauthClientId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "deletedAt" timestamp with time zone,
    "grantId" uuid
);

--
-- Name: oauth_authorization_codes; Type: TABLE
--

CREATE TABLE oauth_authorization_codes (
    id uuid NOT NULL,
    "authorizationCodeHash" character varying(255) NOT NULL,
    "codeChallenge" character varying(255),
    "codeChallengeMethod" character varying(255),
    scope character varying(255)[] NOT NULL,
    "oauthClientId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "redirectUri" character varying(255) NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "grantId" uuid
);

--
-- Name: oauth_clients; Type: TABLE
--

CREATE TABLE oauth_clients (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(255),
    "developerName" character varying(255),
    "developerUrl" character varying(255),
    "avatarUrl" character varying(255),
    "clientId" character varying(255) NOT NULL,
    "clientSecret" bytea NOT NULL,
    published boolean DEFAULT false NOT NULL,
    "teamId" uuid NOT NULL,
    "createdById" uuid NOT NULL,
    "redirectUris" character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[] NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "deletedAt" timestamp with time zone,
    "clientType" character varying(255) DEFAULT 'confidential'::character varying NOT NULL
);

--
-- Name: pins; Type: TABLE
--

CREATE TABLE pins (
    id uuid NOT NULL,
    "documentId" uuid NOT NULL,
    "collectionId" uuid,
    "teamId" uuid NOT NULL,
    "createdById" uuid NOT NULL,
    index character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);

--
-- Name: reactions; Type: TABLE
--

CREATE TABLE reactions (
    id uuid NOT NULL,
    emoji character varying(255) NOT NULL,
    "userId" uuid NOT NULL,
    "commentId" uuid NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);

--
-- Name: revisions; Type: TABLE
--

CREATE TABLE revisions (
    id uuid NOT NULL,
    title character varying NOT NULL,
    text text,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "userId" uuid NOT NULL,
    "documentId" uuid NOT NULL,
    "editorVersion" character varying(255),
    version smallint,
    content jsonb,
    icon character varying(255),
    color character varying(255),
    name character varying(255),
    "deletedAt" timestamp with time zone,
    "collaboratorIds" uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL
);

--
-- Name: search_queries; Type: TABLE
--

CREATE TABLE search_queries (
    id uuid NOT NULL,
    "userId" uuid,
    "teamId" uuid,
    source enum_search_queries_source NOT NULL,
    query character varying(255) NOT NULL,
    results integer NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "shareId" uuid,
    score integer,
    answer text
);

--
-- Name: shares; Type: TABLE
--

CREATE TABLE shares (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    "teamId" uuid NOT NULL,
    "documentId" uuid,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "revokedAt" timestamp with time zone,
    "revokedById" uuid,
    published boolean DEFAULT false NOT NULL,
    "lastAccessedAt" timestamp with time zone,
    "includeChildDocuments" boolean DEFAULT false NOT NULL,
    views integer DEFAULT 0,
    "urlId" character varying(255),
    domain character varying(255),
    "allowIndexing" boolean DEFAULT true NOT NULL,
    "showLastUpdated" boolean DEFAULT false NOT NULL,
    "collectionId" uuid,
    "showTOC" boolean DEFAULT false NOT NULL
);

--
-- Name: stars; Type: TABLE
--

CREATE TABLE stars (
    id uuid NOT NULL,
    "documentId" uuid,
    "userId" uuid NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    index character varying(255),
    "collectionId" uuid
);

--
-- Name: subscriptions; Type: TABLE
--

CREATE TABLE subscriptions (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    "documentId" uuid,
    event character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "deletedAt" timestamp with time zone,
    "collectionId" uuid
);

--
-- Name: team_domains; Type: TABLE
--

CREATE TABLE team_domains (
    id uuid NOT NULL,
    "teamId" uuid NOT NULL,
    "createdById" uuid NOT NULL,
    name character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);

--
-- Name: teams; Type: TABLE
--

CREATE TABLE teams (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "avatarUrl" character varying(4096),
    "deletedAt" timestamp with time zone,
    sharing boolean DEFAULT true NOT NULL,
    subdomain character varying(255),
    "documentEmbeds" boolean DEFAULT true NOT NULL,
    "guestSignin" boolean DEFAULT false NOT NULL,
    domain character varying(255),
    "signupQueryParams" jsonb,
    "collaborativeEditing" boolean,
    "defaultUserRole" character varying(255) DEFAULT 'member'::character varying NOT NULL,
    "defaultCollectionId" uuid,
    "memberCollectionCreate" boolean DEFAULT true NOT NULL,
    "inviteRequired" boolean DEFAULT false NOT NULL,
    preferences jsonb,
    "suspendedAt" timestamp with time zone,
    "lastActiveAt" timestamp with time zone,
    "memberTeamCreate" boolean DEFAULT true NOT NULL,
    "approximateTotalAttachmentsSize" bigint DEFAULT 0,
    "previousSubdomains" character varying(255)[],
    description text,
    "passkeysEnabled" boolean DEFAULT false NOT NULL
);

--
-- Name: user_authentications; Type: TABLE
--

CREATE TABLE user_authentications (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    "authenticationProviderId" uuid NOT NULL,
    "accessToken" bytea,
    "refreshToken" bytea,
    scopes character varying(255)[],
    "providerId" character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "expiresAt" timestamp with time zone,
    "lastValidatedAt" timestamp with time zone
);

--
-- Name: user_passkeys; Type: TABLE
--

CREATE TABLE user_passkeys (
    id uuid NOT NULL,
    name text NOT NULL,
    "userAgent" text,
    "credentialId" text NOT NULL,
    "credentialPublicKey" bytea NOT NULL,
    aaguid text,
    counter bigint DEFAULT 0 NOT NULL,
    transports character varying(255)[],
    "lastActiveAt" timestamp with time zone,
    "userId" uuid NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);

--
-- Name: users; Type: TABLE
--

CREATE TABLE users (
    id uuid NOT NULL,
    email character varying(255) DEFAULT NULL::character varying,
    name character varying NOT NULL,
    "jwtSecret" bytea,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "teamId" uuid,
    "avatarUrl" character varying(4096),
    "suspendedById" uuid,
    "suspendedAt" timestamp with time zone,
    "lastActiveAt" timestamp with time zone,
    "lastActiveIp" character varying(255),
    "lastSignedInAt" timestamp with time zone,
    "lastSignedInIp" character varying(255),
    "deletedAt" timestamp with time zone,
    "lastSigninEmailSentAt" timestamp with time zone,
    language character varying(255),
    flags jsonb,
    "invitedById" uuid,
    preferences jsonb,
    "notificationSettings" jsonb DEFAULT '{}'::jsonb NOT NULL,
    role enum_users_role NOT NULL,
    timezone character varying(255)
);

--
-- Name: views; Type: TABLE
--

CREATE TABLE views (
    id uuid NOT NULL,
    "documentId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    count integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "lastEditingAt" timestamp with time zone
);

--
-- Name: webhook_deliveries; Type: TABLE
--

CREATE TABLE webhook_deliveries (
    id uuid NOT NULL,
    "webhookSubscriptionId" uuid NOT NULL,
    status character varying(255) NOT NULL,
    "statusCode" integer,
    "requestBody" jsonb,
    "requestHeaders" jsonb,
    "responseBody" text,
    "responseHeaders" jsonb,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);

--
-- Name: webhook_subscriptions; Type: TABLE
--

CREATE TABLE webhook_subscriptions (
    id uuid NOT NULL,
    "teamId" uuid NOT NULL,
    "createdById" uuid NOT NULL,
    url character varying(255) NOT NULL,
    enabled boolean NOT NULL,
    name character varying(255) NOT NULL,
    events character varying(255)[] NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "deletedAt" timestamp with time zone,
    secret bytea
);

--
-- Name: apiKeys apiKeys_hash_key; Type: CONSTRAINT
--

ALTER TABLE ONLY "apiKeys"
    ADD CONSTRAINT "apiKeys_hash_key" UNIQUE (hash);

--
-- Name: apiKeys apiKeys_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY "apiKeys"
    ADD CONSTRAINT "apiKeys_pkey" PRIMARY KEY (id);

--
-- Name: apiKeys apiKeys_secret_key; Type: CONSTRAINT
--

ALTER TABLE ONLY "apiKeys"
    ADD CONSTRAINT "apiKeys_secret_key" UNIQUE (secret);

--
-- Name: collections atlases_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY collections
    ADD CONSTRAINT atlases_pkey PRIMARY KEY (id);

--
-- Name: collections atlases_urlId_key; Type: CONSTRAINT
--

ALTER TABLE ONLY collections
    ADD CONSTRAINT "atlases_urlId_key" UNIQUE ("urlId");

--
-- Name: attachments attachments_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);

--
-- Name: authentication_providers authentication_providers_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY authentication_providers
    ADD CONSTRAINT authentication_providers_pkey PRIMARY KEY (id);

--
-- Name: authentication_providers authentication_providers_providerId_teamId_uk; Type: CONSTRAINT
--

ALTER TABLE ONLY authentication_providers
    ADD CONSTRAINT "authentication_providers_providerId_teamId_uk" UNIQUE ("providerId", "teamId");

--
-- Name: authentications authentications_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY authentications
    ADD CONSTRAINT authentications_pkey PRIMARY KEY (id);

--
-- Name: relationships backlinks_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY relationships
    ADD CONSTRAINT backlinks_pkey PRIMARY KEY (id);

--
-- Name: comments comments_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);

--
-- Name: documents documents_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);

--
-- Name: documents documents_urlId_key; Type: CONSTRAINT
--

ALTER TABLE ONLY documents
    ADD CONSTRAINT "documents_urlId_key" UNIQUE ("urlId");

--
-- Name: emojis emojis_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY emojis
    ADD CONSTRAINT emojis_pkey PRIMARY KEY (id);

--
-- Name: events events_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);

--
-- Name: file_operations file_operations_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY file_operations
    ADD CONSTRAINT file_operations_pkey PRIMARY KEY (id);

--
-- Name: group_permissions group_permissions_id_pk; Type: CONSTRAINT
--

ALTER TABLE ONLY group_permissions
    ADD CONSTRAINT group_permissions_id_pk PRIMARY KEY (id);

--
-- Name: group_users group_users_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY group_users
    ADD CONSTRAINT group_users_pkey PRIMARY KEY ("groupId", "userId");

--
-- Name: groups groups_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);

--
-- Name: import_tasks import_tasks_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY import_tasks
    ADD CONSTRAINT import_tasks_pkey PRIMARY KEY (id);

--
-- Name: imports imports_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY imports
    ADD CONSTRAINT imports_pkey PRIMARY KEY (id);

--
-- Name: integrations integrations_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY integrations
    ADD CONSTRAINT integrations_pkey PRIMARY KEY (id);

--
-- Name: notifications notifications_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

--
-- Name: oauth_authentications oauth_authentications_accessTokenHash_key; Type: CONSTRAINT
--

ALTER TABLE ONLY oauth_authentications
    ADD CONSTRAINT "oauth_authentications_accessTokenHash_key" UNIQUE ("accessTokenHash");

--
-- Name: oauth_authentications oauth_authentications_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY oauth_authentications
    ADD CONSTRAINT oauth_authentications_pkey PRIMARY KEY (id);

--
-- Name: oauth_authentications oauth_authentications_refreshTokenHash_key; Type: CONSTRAINT
--

ALTER TABLE ONLY oauth_authentications
    ADD CONSTRAINT "oauth_authentications_refreshTokenHash_key" UNIQUE ("refreshTokenHash");

--
-- Name: oauth_authorization_codes oauth_authorization_codes_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY oauth_authorization_codes
    ADD CONSTRAINT oauth_authorization_codes_pkey PRIMARY KEY (id);

--
-- Name: oauth_clients oauth_clients_clientId_key; Type: CONSTRAINT
--

ALTER TABLE ONLY oauth_clients
    ADD CONSTRAINT "oauth_clients_clientId_key" UNIQUE ("clientId");

--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);

--
-- Name: pins pins_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY pins
    ADD CONSTRAINT pins_pkey PRIMARY KEY (id);

--
-- Name: reactions reactions_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY reactions
    ADD CONSTRAINT reactions_pkey PRIMARY KEY (id);

--
-- Name: revisions revisions_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY revisions
    ADD CONSTRAINT revisions_pkey PRIMARY KEY (id);

--
-- Name: search_queries search_queries_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY search_queries
    ADD CONSTRAINT search_queries_pkey PRIMARY KEY (id);

--
-- Name: shares shares_domain_key; Type: CONSTRAINT
--

ALTER TABLE ONLY shares
    ADD CONSTRAINT shares_domain_key UNIQUE (domain);

--
-- Name: shares shares_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY shares
    ADD CONSTRAINT shares_pkey PRIMARY KEY (id);

--
-- Name: stars stars_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY stars
    ADD CONSTRAINT stars_pkey PRIMARY KEY (id);

--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);

--
-- Name: team_domains team_domains_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY team_domains
    ADD CONSTRAINT team_domains_pkey PRIMARY KEY (id);

--
-- Name: teams teams_domain_key; Type: CONSTRAINT
--

ALTER TABLE ONLY teams
    ADD CONSTRAINT teams_domain_key UNIQUE (domain);

--
-- Name: teams teams_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);

--
-- Name: teams teams_subdomain_key; Type: CONSTRAINT
--

ALTER TABLE ONLY teams
    ADD CONSTRAINT teams_subdomain_key UNIQUE (subdomain);

--
-- Name: user_authentications user_authentications_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY user_authentications
    ADD CONSTRAINT user_authentications_pkey PRIMARY KEY (id);

--
-- Name: user_authentications user_authentications_providerId_userId_uk; Type: CONSTRAINT
--

ALTER TABLE ONLY user_authentications
    ADD CONSTRAINT "user_authentications_providerId_userId_uk" UNIQUE ("providerId", "userId");

--
-- Name: user_passkeys user_passkeys_credentialId_key; Type: CONSTRAINT
--

ALTER TABLE ONLY user_passkeys
    ADD CONSTRAINT "user_passkeys_credentialId_key" UNIQUE ("credentialId");

--
-- Name: user_passkeys user_passkeys_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY user_passkeys
    ADD CONSTRAINT user_passkeys_pkey PRIMARY KEY (id);

--
-- Name: user_permissions user_permissions_id_pk; Type: CONSTRAINT
--

ALTER TABLE ONLY user_permissions
    ADD CONSTRAINT user_permissions_id_pk PRIMARY KEY (id);

--
-- Name: users users_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

--
-- Name: views views_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY views
    ADD CONSTRAINT views_pkey PRIMARY KEY (id);

--
-- Name: webhook_deliveries webhook_deliveries_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_pkey PRIMARY KEY (id);

--
-- Name: webhook_subscriptions webhook_subscriptions_pkey; Type: CONSTRAINT
--

ALTER TABLE ONLY webhook_subscriptions
    ADD CONSTRAINT webhook_subscriptions_pkey PRIMARY KEY (id);

--
-- Name: api_keys_user_id_deleted_at; Type: INDEX
--

CREATE INDEX api_keys_user_id_deleted_at ON "apiKeys" USING btree ("userId", "deletedAt");

--
-- Name: attachments_created_at; Type: INDEX
--

CREATE INDEX attachments_created_at ON attachments USING btree ("createdAt");

--
-- Name: attachments_document_id; Type: INDEX
--

CREATE INDEX attachments_document_id ON attachments USING btree ("documentId");

--
-- Name: attachments_expires_at; Type: INDEX
--

CREATE INDEX attachments_expires_at ON attachments USING btree ("expiresAt");

--
-- Name: attachments_team_id; Type: INDEX
--

CREATE INDEX attachments_team_id ON attachments USING btree ("teamId");

--
-- Name: authentication_providers_provider_id; Type: INDEX
--

CREATE INDEX authentication_providers_provider_id ON authentication_providers USING btree ("providerId");

--
-- Name: authentications_team_id_service; Type: INDEX
--

CREATE INDEX authentications_team_id_service ON authentications USING btree ("teamId", service);

--
-- Name: backlinks_document_id; Type: INDEX
--

CREATE INDEX backlinks_document_id ON relationships USING btree ("documentId");

--
-- Name: backlinks_reverse_document_id; Type: INDEX
--

CREATE INDEX backlinks_reverse_document_id ON relationships USING btree ("reverseDocumentId");

--
-- Name: collections_api_import_id; Type: INDEX
--

CREATE INDEX collections_api_import_id ON collections USING btree ("apiImportId");

--
-- Name: collections_archived_at; Type: INDEX
--

CREATE INDEX collections_archived_at ON collections USING btree ("archivedAt");

--
-- Name: collections_import_id; Type: INDEX
--

CREATE INDEX collections_import_id ON collections USING btree ("importId");

--
-- Name: collections_team_id_deleted_at; Type: INDEX
--

CREATE INDEX collections_team_id_deleted_at ON collections USING btree ("teamId", "deletedAt");

--
-- Name: comments_created_at; Type: INDEX
--

CREATE INDEX comments_created_at ON comments USING btree ("createdAt");

--
-- Name: comments_document_id; Type: INDEX
--

CREATE INDEX comments_document_id ON comments USING btree ("documentId");

--
-- Name: documents_api_import_id; Type: INDEX
--

CREATE INDEX documents_api_import_id ON documents USING btree ("apiImportId");

--
-- Name: documents_archived_at; Type: INDEX
--

CREATE INDEX documents_archived_at ON documents USING btree ("archivedAt");

--
-- Name: documents_collection_id; Type: INDEX
--

CREATE INDEX documents_collection_id ON documents USING btree ("collectionId");

--
-- Name: documents_import_id; Type: INDEX
--

CREATE INDEX documents_import_id ON documents USING btree ("importId");

--
-- Name: documents_parent_document_id_atlas_id_deleted_at; Type: INDEX
--

CREATE INDEX documents_parent_document_id_atlas_id_deleted_at ON documents USING btree ("parentDocumentId", "collectionId", "deletedAt");

--
-- Name: documents_published_at; Type: INDEX
--

CREATE INDEX documents_published_at ON documents USING btree ("publishedAt");

--
-- Name: documents_team_id; Type: INDEX
--

CREATE INDEX documents_team_id ON documents USING btree ("teamId", "deletedAt");

--
-- Name: documents_title_idx; Type: INDEX
--

CREATE INDEX documents_title_idx ON documents USING gin (title gin_trgm_ops);

--
-- Name: documents_tsv_idx; Type: INDEX
--

CREATE INDEX documents_tsv_idx ON documents USING gin ("searchVector");

--
-- Name: documents_updated_at; Type: INDEX
--

CREATE INDEX documents_updated_at ON documents USING btree ("updatedAt");

--
-- Name: documents_url_id_deleted_at; Type: INDEX
--

CREATE INDEX documents_url_id_deleted_at ON documents USING btree ("urlId", "deletedAt");

--
-- Name: emojis_attachment_id; Type: INDEX
--

CREATE INDEX emojis_attachment_id ON emojis USING btree ("attachmentId");

--
-- Name: emojis_created_by_id; Type: INDEX
--

CREATE INDEX emojis_created_by_id ON emojis USING btree ("createdById");

--
-- Name: emojis_team_id; Type: INDEX
--

CREATE INDEX emojis_team_id ON emojis USING btree ("teamId");

--
-- Name: emojis_team_id_name; Type: INDEX
--

CREATE UNIQUE INDEX emojis_team_id_name ON emojis USING btree ("teamId", name);

--
-- Name: events_actor_id; Type: INDEX
--

CREATE INDEX events_actor_id ON events USING btree ("actorId");

--
-- Name: events_created_at; Type: INDEX
--

CREATE INDEX events_created_at ON events USING btree ("createdAt");

--
-- Name: events_document_id; Type: INDEX
--

CREATE INDEX events_document_id ON events USING btree ("documentId");

--
-- Name: events_name; Type: INDEX
--

CREATE INDEX events_name ON events USING btree (name);

--
-- Name: events_team_id_collection_id; Type: INDEX
--

CREATE INDEX events_team_id_collection_id ON events USING btree ("teamId", "collectionId");

--
-- Name: file_operations_type_state; Type: INDEX
--

CREATE INDEX file_operations_type_state ON file_operations USING btree (type, state);

--
-- Name: group_permissions_collection_id_group_id; Type: INDEX
--

CREATE INDEX group_permissions_collection_id_group_id ON group_permissions USING btree ("collectionId", "groupId");

--
-- Name: group_permissions_deleted_at; Type: INDEX
--

CREATE INDEX group_permissions_deleted_at ON group_permissions USING btree ("deletedAt");

--
-- Name: group_permissions_document_id; Type: INDEX
--

CREATE INDEX group_permissions_document_id ON group_permissions USING btree ("documentId");

--
-- Name: group_permissions_group_id; Type: INDEX
--

CREATE INDEX group_permissions_group_id ON group_permissions USING btree ("groupId");

--
-- Name: group_permissions_source_id; Type: INDEX
--

CREATE INDEX group_permissions_source_id ON group_permissions USING btree ("sourceId");

--
-- Name: group_users_user_id; Type: INDEX
--

CREATE INDEX group_users_user_id ON group_users USING btree ("userId");

--
-- Name: groups_external_id; Type: INDEX
--

CREATE INDEX groups_external_id ON groups USING btree ("externalId");

--
-- Name: groups_team_id; Type: INDEX
--

CREATE INDEX groups_team_id ON groups USING btree ("teamId");

--
-- Name: import_tasks_import_id; Type: INDEX
--

CREATE INDEX import_tasks_import_id ON import_tasks USING btree ("importId");

--
-- Name: import_tasks_state_import_id; Type: INDEX
--

CREATE INDEX import_tasks_state_import_id ON import_tasks USING btree (state, "importId");

--
-- Name: imports_service_team_id; Type: INDEX
--

CREATE INDEX imports_service_team_id ON imports USING btree (service, "teamId");

--
-- Name: imports_state_team_id; Type: INDEX
--

CREATE INDEX imports_state_team_id ON imports USING btree (state, "teamId");

--
-- Name: integrations_service_type; Type: INDEX
--

CREATE INDEX integrations_service_type ON integrations USING btree (service, type);

--
-- Name: integrations_service_type_createdAt; Type: INDEX
--

CREATE INDEX "integrations_service_type_createdAt" ON integrations USING btree (service, type, "createdAt");

--
-- Name: integrations_settings_slack_gin; Type: INDEX
--

CREATE INDEX integrations_settings_slack_gin ON integrations USING gin (((settings -> 'slack'::text))) WHERE (((service)::text = 'slack'::text) AND ((type)::text = 'linkedAccount'::text));

--
-- Name: integrations_team_id_type_service; Type: INDEX
--

CREATE INDEX integrations_team_id_type_service ON integrations USING btree ("teamId", type, service);

--
-- Name: notifications_created_at; Type: INDEX
--

CREATE INDEX notifications_created_at ON notifications USING btree ("createdAt");

--
-- Name: notifications_document_id_user_id; Type: INDEX
--

CREATE INDEX notifications_document_id_user_id ON notifications USING btree ("documentId", "userId");

--
-- Name: notifications_emailed_at; Type: INDEX
--

CREATE INDEX notifications_emailed_at ON notifications USING btree ("emailedAt");

--
-- Name: notifications_event; Type: INDEX
--

CREATE INDEX notifications_event ON notifications USING btree (event);

--
-- Name: notifications_team_id_user_id; Type: INDEX
--

CREATE INDEX notifications_team_id_user_id ON notifications USING btree ("teamId", "userId");

--
-- Name: oauth_authentications_grant_id; Type: INDEX
--

CREATE INDEX oauth_authentications_grant_id ON oauth_authentications USING btree ("grantId");

--
-- Name: oauth_authorization_codes_grant_id; Type: INDEX
--

CREATE INDEX oauth_authorization_codes_grant_id ON oauth_authorization_codes USING btree ("grantId");

--
-- Name: oauth_clients_team_id; Type: INDEX
--

CREATE INDEX oauth_clients_team_id ON oauth_clients USING btree ("teamId");

--
-- Name: pins_collection_id; Type: INDEX
--

CREATE INDEX pins_collection_id ON pins USING btree ("collectionId");

--
-- Name: pins_team_id; Type: INDEX
--

CREATE INDEX pins_team_id ON pins USING btree ("teamId");

--
-- Name: reactions_comment_id; Type: INDEX
--

CREATE INDEX reactions_comment_id ON reactions USING btree ("commentId");

--
-- Name: reactions_emoji_user_id; Type: INDEX
--

CREATE INDEX reactions_emoji_user_id ON reactions USING btree (emoji, "userId");

--
-- Name: relationships_document_id_type; Type: INDEX
--

CREATE INDEX relationships_document_id_type ON relationships USING btree ("documentId", type);

--
-- Name: revisions_created_at; Type: INDEX
--

CREATE INDEX revisions_created_at ON revisions USING btree ("createdAt");

--
-- Name: revisions_document_id; Type: INDEX
--

CREATE INDEX revisions_document_id ON revisions USING btree ("documentId");

--
-- Name: search_queries_created_at; Type: INDEX
--

CREATE INDEX search_queries_created_at ON search_queries USING btree ("createdAt");

--
-- Name: search_queries_team_id; Type: INDEX
--

CREATE INDEX search_queries_team_id ON search_queries USING btree ("teamId");

--
-- Name: search_queries_user_id; Type: INDEX
--

CREATE INDEX search_queries_user_id ON search_queries USING btree ("userId");

--
-- Name: shares_urlId_teamId_not_revoked_uk; Type: INDEX
--

CREATE UNIQUE INDEX "shares_urlId_teamId_not_revoked_uk" ON shares USING btree ("urlId", "teamId") WHERE ("revokedAt" IS NULL);

--
-- Name: stars_document_id_user_id; Type: INDEX
--

CREATE INDEX stars_document_id_user_id ON stars USING btree ("documentId", "userId");

--
-- Name: stars_user_id_document_id; Type: INDEX
--

CREATE INDEX stars_user_id_document_id ON stars USING btree ("userId", "documentId");

--
-- Name: subscriptions_user_id_collection_id_event; Type: INDEX
--

CREATE UNIQUE INDEX subscriptions_user_id_collection_id_event ON subscriptions USING btree ("userId", "collectionId", event);

--
-- Name: subscriptions_user_id_document_id_event; Type: INDEX
--

CREATE UNIQUE INDEX subscriptions_user_id_document_id_event ON subscriptions USING btree ("userId", "documentId", event);

--
-- Name: team_domains_team_id_name; Type: INDEX
--

CREATE UNIQUE INDEX team_domains_team_id_name ON team_domains USING btree ("teamId", name);

--
-- Name: teams_previous_subdomains; Type: INDEX
--

CREATE INDEX teams_previous_subdomains ON teams USING gin ("previousSubdomains");

--
-- Name: teams_subdomain; Type: INDEX
--

CREATE INDEX teams_subdomain ON teams USING btree (subdomain);

--
-- Name: user_authentications_providerId_createdAt; Type: INDEX
--

CREATE INDEX "user_authentications_providerId_createdAt" ON user_authentications USING btree ("providerId", "createdAt");

--
-- Name: user_authentications_user_id; Type: INDEX
--

CREATE INDEX user_authentications_user_id ON user_authentications USING btree ("userId");

--
-- Name: user_passkeys_user_id; Type: INDEX
--

CREATE INDEX user_passkeys_user_id ON user_passkeys USING btree ("userId");

--
-- Name: user_permissions_collection_id_user_id; Type: INDEX
--

CREATE INDEX user_permissions_collection_id_user_id ON user_permissions USING btree ("collectionId", "userId");

--
-- Name: user_permissions_document_id_user_id; Type: INDEX
--

CREATE INDEX user_permissions_document_id_user_id ON user_permissions USING btree ("documentId", "userId");

--
-- Name: user_permissions_source_id; Type: INDEX
--

CREATE INDEX user_permissions_source_id ON user_permissions USING btree ("sourceId");

--
-- Name: user_permissions_user_id; Type: INDEX
--

CREATE INDEX user_permissions_user_id ON user_permissions USING btree ("userId");

--
-- Name: users_email; Type: INDEX
--

CREATE INDEX users_email ON users USING btree (email);

--
-- Name: users_team_id; Type: INDEX
--

CREATE INDEX users_team_id ON users USING btree ("teamId");

--
-- Name: views_document_id_user_id; Type: INDEX
--

CREATE INDEX views_document_id_user_id ON views USING btree ("documentId", "userId");

--
-- Name: views_updated_at; Type: INDEX
--

CREATE INDEX views_updated_at ON views USING btree ("updatedAt");

--
-- Name: views_user_id; Type: INDEX
--

CREATE INDEX views_user_id ON views USING btree ("userId");

--
-- Name: webhook_deliveries_createdAt; Type: INDEX
--

CREATE INDEX "webhook_deliveries_createdAt" ON webhook_deliveries USING btree ("createdAt");

--
-- Name: webhook_deliveries_webhook_subscription_id; Type: INDEX
--

CREATE INDEX webhook_deliveries_webhook_subscription_id ON webhook_deliveries USING btree ("webhookSubscriptionId");

--
-- Name: webhook_subscriptions_team_id_enabled; Type: INDEX
--

CREATE INDEX webhook_subscriptions_team_id_enabled ON webhook_subscriptions USING btree ("teamId", enabled);

--
-- Name: collections atlases_tsvectorupdate; Type: TRIGGER
--

CREATE TRIGGER atlases_tsvectorupdate BEFORE INSERT OR UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION atlases_search_trigger();

--
-- Name: documents documents_tsvectorupdate; Type: TRIGGER
--

CREATE TRIGGER documents_tsvectorupdate BEFORE INSERT OR UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION documents_search_trigger();

--
-- Name: attachments attachments_teamId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY attachments
    ADD CONSTRAINT "attachments_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES teams(id);

--
-- Name: attachments attachments_userId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY attachments
    ADD CONSTRAINT "attachments_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id);

--
-- Name: authentication_providers authentication_providers_teamId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY authentication_providers
    ADD CONSTRAINT "authentication_providers_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES teams(id);

--
-- Name: authentications authentications_teamId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY authentications
    ADD CONSTRAINT "authentications_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES teams(id);

--
-- Name: authentications authentications_userId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY authentications
    ADD CONSTRAINT "authentications_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id);

--
-- Name: relationships backlinks_documentId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY relationships
    ADD CONSTRAINT "backlinks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES documents(id) ON DELETE CASCADE;

--
-- Name: relationships backlinks_reverseDocumentId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY relationships
    ADD CONSTRAINT "backlinks_reverseDocumentId_fkey" FOREIGN KEY ("reverseDocumentId") REFERENCES documents(id) ON DELETE CASCADE;

--
-- Name: relationships backlinks_userId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY relationships
    ADD CONSTRAINT "backlinks_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id);

--
-- Name: collections collections_apiImportId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY collections
    ADD CONSTRAINT "collections_apiImportId_fkey" FOREIGN KEY ("apiImportId") REFERENCES imports(id);

--
-- Name: collections collections_archivedById_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY collections
    ADD CONSTRAINT "collections_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES users(id);

--
-- Name: collections collections_importId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY collections
    ADD CONSTRAINT "collections_importId_fkey" FOREIGN KEY ("importId") REFERENCES file_operations(id);

--
-- Name: comments comments_createdById_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY comments
    ADD CONSTRAINT "comments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES users(id) ON DELETE CASCADE;

--
-- Name: comments comments_documentId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY comments
    ADD CONSTRAINT "comments_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES documents(id) ON DELETE CASCADE;

--
-- Name: comments comments_parentCommentId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY comments
    ADD CONSTRAINT "comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES comments(id) ON DELETE CASCADE;

--
-- Name: comments comments_resolvedById_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY comments
    ADD CONSTRAINT "comments_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES users(id) ON DELETE SET NULL;

--
-- Name: documents documents_apiImportId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY documents
    ADD CONSTRAINT "documents_apiImportId_fkey" FOREIGN KEY ("apiImportId") REFERENCES imports(id);

--
-- Name: documents documents_atlasId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY documents
    ADD CONSTRAINT "documents_atlasId_fkey" FOREIGN KEY ("collectionId") REFERENCES collections(id) ON DELETE CASCADE;

--
-- Name: documents documents_createdById_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY documents
    ADD CONSTRAINT "documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES users(id);

--
-- Name: documents documents_importId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY documents
    ADD CONSTRAINT "documents_importId_fkey" FOREIGN KEY ("importId") REFERENCES file_operations(id);

--
-- Name: documents documents_lastModifiedById_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY documents
    ADD CONSTRAINT "documents_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES users(id);

--
-- Name: documents documents_parentDocumentId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY documents
    ADD CONSTRAINT "documents_parentDocumentId_fkey" FOREIGN KEY ("parentDocumentId") REFERENCES documents(id) ON DELETE CASCADE;

--
-- Name: documents documents_teamId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY documents
    ADD CONSTRAINT "documents_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES teams(id) ON DELETE CASCADE;

--
-- Name: emojis emojis_attachmentId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY emojis
    ADD CONSTRAINT "emojis_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES attachments(id) ON DELETE CASCADE;

--
-- Name: emojis emojis_createdById_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY emojis
    ADD CONSTRAINT "emojis_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES users(id) ON DELETE CASCADE;

--
-- Name: emojis emojis_teamId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY emojis
    ADD CONSTRAINT "emojis_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES teams(id) ON DELETE CASCADE;

--
-- Name: events events_actorId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY events
    ADD CONSTRAINT "events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES users(id);

--
-- Name: events events_collectionId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY events
    ADD CONSTRAINT "events_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES collections(id);

--
-- Name: events events_teamId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY events
    ADD CONSTRAINT "events_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES teams(id);

--
-- Name: events events_userId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY events
    ADD CONSTRAINT "events_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id);

--
-- Name: file_operations file_operations_collectionId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY file_operations
    ADD CONSTRAINT "file_operations_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES collections(id) ON DELETE CASCADE;

--
-- Name: file_operations file_operations_documentId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY file_operations
    ADD CONSTRAINT "file_operations_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES documents(id) ON DELETE CASCADE;

--
-- Name: file_operations file_operations_teamId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY file_operations
    ADD CONSTRAINT "file_operations_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES teams(id) ON DELETE CASCADE;

--
-- Name: file_operations file_operations_userId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY file_operations
    ADD CONSTRAINT "file_operations_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id);

--
-- Name: group_permissions group_permissions_collectionId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY group_permissions
    ADD CONSTRAINT "group_permissions_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES collections(id) ON DELETE SET NULL;

--
-- Name: group_permissions group_permissions_createdById_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY group_permissions
    ADD CONSTRAINT "group_permissions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES users(id) ON DELETE SET NULL;

--
-- Name: group_permissions group_permissions_documentId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY group_permissions
    ADD CONSTRAINT "group_permissions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES documents(id) ON DELETE CASCADE;

--
-- Name: group_permissions group_permissions_groupId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY group_permissions
    ADD CONSTRAINT "group_permissions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES groups(id) ON DELETE CASCADE;

--
-- Name: group_permissions group_permissions_sourceId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY group_permissions
    ADD CONSTRAINT "group_permissions_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES group_permissions(id) ON DELETE CASCADE;

--
-- Name: group_users group_users_createdById_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY group_users
    ADD CONSTRAINT "group_users_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES users(id);

--
-- Name: group_users group_users_groupId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY group_users
    ADD CONSTRAINT "group_users_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES groups(id) ON DELETE CASCADE;

--
-- Name: group_users group_users_userId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY group_users
    ADD CONSTRAINT "group_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

--
-- Name: groups groups_createdById_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY groups
    ADD CONSTRAINT "groups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES users(id);

--
-- Name: groups groups_teamId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY groups
    ADD CONSTRAINT "groups_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES teams(id);

--
-- Name: import_tasks import_tasks_importId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY import_tasks
    ADD CONSTRAINT "import_tasks_importId_fkey" FOREIGN KEY ("importId") REFERENCES imports(id) ON DELETE CASCADE;

--
-- Name: imports imports_createdById_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY imports
    ADD CONSTRAINT "imports_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES users(id);

--
-- Name: imports imports_integrationId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY imports
    ADD CONSTRAINT "imports_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES integrations(id);

--
-- Name: imports imports_teamId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY imports
    ADD CONSTRAINT "imports_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES teams(id);

--
-- Name: integrations integrations_authenticationId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY integrations
    ADD CONSTRAINT "integrations_authenticationId_fkey" FOREIGN KEY ("authenticationId") REFERENCES authentications(id) ON DELETE CASCADE;

--
-- Name: integrations integrations_collectionId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY integrations
    ADD CONSTRAINT "integrations_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES collections(id) ON DELETE CASCADE;

--
-- Name: integrations integrations_teamId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY integrations
    ADD CONSTRAINT "integrations_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES teams(id) ON DELETE CASCADE;

--
-- Name: integrations integrations_userId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY integrations
    ADD CONSTRAINT "integrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id);

--
-- Name: notifications notifications_actorId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY notifications
    ADD CONSTRAINT "notifications_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES users(id) ON DELETE SET NULL;

--
-- Name: notifications notifications_collectionId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY notifications
    ADD CONSTRAINT "notifications_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES collections(id) ON DELETE CASCADE;

--
-- Name: notifications notifications_commentId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY notifications
    ADD CONSTRAINT "notifications_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES comments(id) ON DELETE CASCADE;

--
-- Name: notifications notifications_documentId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY notifications
    ADD CONSTRAINT "notifications_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES documents(id) ON DELETE CASCADE;

--
-- Name: notifications notifications_groupId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY notifications
    ADD CONSTRAINT "notifications_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES groups(id) ON DELETE CASCADE;

--
-- Name: notifications notifications_revisionId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY notifications
    ADD CONSTRAINT "notifications_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES revisions(id) ON DELETE CASCADE;

--
-- Name: notifications notifications_teamId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY notifications
    ADD CONSTRAINT "notifications_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES teams(id) ON DELETE CASCADE;

--
-- Name: notifications notifications_userId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY notifications
    ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

--
-- Name: oauth_authentications oauth_authentications_oauthClientId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY oauth_authentications
    ADD CONSTRAINT "oauth_authentications_oauthClientId_fkey" FOREIGN KEY ("oauthClientId") REFERENCES oauth_clients(id) ON DELETE CASCADE;

--
-- Name: oauth_authentications oauth_authentications_userId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY oauth_authentications
    ADD CONSTRAINT "oauth_authentications_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

--
-- Name: oauth_authorization_codes oauth_authorization_codes_oauthClientId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY oauth_authorization_codes
    ADD CONSTRAINT "oauth_authorization_codes_oauthClientId_fkey" FOREIGN KEY ("oauthClientId") REFERENCES oauth_clients(id) ON DELETE CASCADE;

--
-- Name: oauth_authorization_codes oauth_authorization_codes_userId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY oauth_authorization_codes
    ADD CONSTRAINT "oauth_authorization_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

--
-- Name: oauth_clients oauth_clients_createdById_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY oauth_clients
    ADD CONSTRAINT "oauth_clients_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES users(id);

--
-- Name: oauth_clients oauth_clients_teamId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY oauth_clients
    ADD CONSTRAINT "oauth_clients_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES teams(id) ON DELETE CASCADE;

--
-- Name: pins pins_collectionId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY pins
    ADD CONSTRAINT "pins_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES collections(id) ON DELETE CASCADE;

--
-- Name: pins pins_createdById_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY pins
    ADD CONSTRAINT "pins_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES users(id);

--
-- Name: pins pins_documentId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY pins
    ADD CONSTRAINT "pins_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES documents(id) ON DELETE CASCADE;

--
-- Name: pins pins_teamId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY pins
    ADD CONSTRAINT "pins_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES teams(id) ON DELETE CASCADE;

--
-- Name: reactions reactions_commentId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY reactions
    ADD CONSTRAINT "reactions_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES comments(id) ON DELETE CASCADE;

--
-- Name: reactions reactions_userId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY reactions
    ADD CONSTRAINT "reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

--
-- Name: revisions revisions_documentId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY revisions
    ADD CONSTRAINT "revisions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES documents(id) ON DELETE CASCADE;

--
-- Name: revisions revisions_userId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY revisions
    ADD CONSTRAINT "revisions_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id);

--
-- Name: search_queries search_queries_shareId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY search_queries
    ADD CONSTRAINT "search_queries_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES shares(id) ON DELETE SET NULL;

--
-- Name: search_queries search_queries_teamId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY search_queries
    ADD CONSTRAINT "search_queries_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES teams(id);

--
-- Name: search_queries search_queries_userId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY search_queries
    ADD CONSTRAINT "search_queries_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id);

--
-- Name: shares shares_collectionId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY shares
    ADD CONSTRAINT "shares_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES collections(id) ON DELETE CASCADE;

--
-- Name: shares shares_documentId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY shares
    ADD CONSTRAINT "shares_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES documents(id) ON DELETE CASCADE;

--
-- Name: shares shares_revokedById_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY shares
    ADD CONSTRAINT "shares_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES users(id);

--
-- Name: shares shares_teamId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY shares
    ADD CONSTRAINT "shares_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES teams(id);

--
-- Name: shares shares_userId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY shares
    ADD CONSTRAINT "shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id);

--
-- Name: stars stars_collectionId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY stars
    ADD CONSTRAINT "stars_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES collections(id) ON DELETE CASCADE;

--
-- Name: stars stars_documentId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY stars
    ADD CONSTRAINT "stars_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES documents(id) ON DELETE CASCADE;

--
-- Name: stars stars_userId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY stars
    ADD CONSTRAINT "stars_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

--
-- Name: subscriptions subscriptions_collectionId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY subscriptions
    ADD CONSTRAINT "subscriptions_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES collections(id) ON DELETE CASCADE;

--
-- Name: subscriptions subscriptions_documentId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY subscriptions
    ADD CONSTRAINT "subscriptions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES documents(id) ON DELETE CASCADE;

--
-- Name: subscriptions subscriptions_userId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY subscriptions
    ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

--
-- Name: team_domains team_domains_createdById_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY team_domains
    ADD CONSTRAINT "team_domains_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES users(id) ON DELETE SET NULL;

--
-- Name: team_domains team_domains_teamId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY team_domains
    ADD CONSTRAINT "team_domains_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES teams(id) ON DELETE CASCADE;

--
-- Name: user_authentications user_authentications_authenticationProviderId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY user_authentications
    ADD CONSTRAINT "user_authentications_authenticationProviderId_fkey" FOREIGN KEY ("authenticationProviderId") REFERENCES authentication_providers(id) ON DELETE CASCADE;

--
-- Name: user_authentications user_authentications_userId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY user_authentications
    ADD CONSTRAINT "user_authentications_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

--
-- Name: user_passkeys user_passkeys_userId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY user_passkeys
    ADD CONSTRAINT "user_passkeys_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

--
-- Name: user_permissions user_permissions_collectionId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY user_permissions
    ADD CONSTRAINT "user_permissions_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES collections(id) ON DELETE SET NULL;

--
-- Name: user_permissions user_permissions_createdById_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY user_permissions
    ADD CONSTRAINT "user_permissions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES users(id) ON DELETE CASCADE;

--
-- Name: user_permissions user_permissions_documentId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY user_permissions
    ADD CONSTRAINT "user_permissions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES documents(id) ON DELETE CASCADE;

--
-- Name: user_permissions user_permissions_sourceId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY user_permissions
    ADD CONSTRAINT "user_permissions_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES user_permissions(id) ON DELETE CASCADE;

--
-- Name: user_permissions user_permissions_userId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY user_permissions
    ADD CONSTRAINT "user_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

--
-- Name: users users_invitedById_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY users
    ADD CONSTRAINT "users_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES users(id);

--
-- Name: users users_suspendedById_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY users
    ADD CONSTRAINT "users_suspendedById_fkey" FOREIGN KEY ("suspendedById") REFERENCES users(id);

--
-- Name: users users_teamId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY users
    ADD CONSTRAINT "users_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES teams(id) ON DELETE CASCADE;

--
-- Name: webhook_deliveries webhook_deliveries_webhookSubscriptionId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY webhook_deliveries
    ADD CONSTRAINT "webhook_deliveries_webhookSubscriptionId_fkey" FOREIGN KEY ("webhookSubscriptionId") REFERENCES webhook_subscriptions(id) ON DELETE CASCADE;

--
-- Name: webhook_subscriptions webhook_subscriptions_createdById_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY webhook_subscriptions
    ADD CONSTRAINT "webhook_subscriptions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES users(id) ON DELETE CASCADE;

--
-- Name: webhook_subscriptions webhook_subscriptions_teamId_fkey; Type: FK CONSTRAINT
--

ALTER TABLE ONLY webhook_subscriptions
    ADD CONSTRAINT "webhook_subscriptions_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES teams(id) ON DELETE CASCADE;
