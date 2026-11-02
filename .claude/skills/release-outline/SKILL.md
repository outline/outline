---
name: release-outline
description: Release a new upstream Outline version of Rob's Kroki fork. Takes a version (e.g. v1.12.0), rebases the kroki_integration branch onto that upstream release commit, type-checks and tests it in Docker, builds and pushes registry.ubuntu-server.atrico.net/outline:<version without v>.1 (e.g. v1.12.0 -> 1.12.0.1), and deploys it on ubuntu-server. Use whenever the user says release, upgrade, bump, roll out or deploy a new Outline version/tag, or "rebase kroki on vX.Y.Z", even if they do not name this skill.
---

# Release Outline

Rob runs a fork of Outline with the Kroki diagram integration on the
`kroki_integration` branch. A release means: move that branch onto an upstream
release, prove it still compiles and passes its tests, publish an image, and
roll the server onto it. Each step gates the next. Stop at the first failure and
report it; do not push a half-verified image to the registry.

Input: a version such as `v1.12.0` (argument to the skill; if missing, ask).
Let `TAG` = the argument with a leading `v` (add it if absent) and `VERSION` =
`TAG` without the `v`, plus a `.1` suffix. The suffix marks the image as the
Kroki build of that upstream release, so `v1.12.0` gives image tag
`1.12.0.1`. Use `TAG` only for git and `VERSION` for everything else (image,
compose file, local build tags).

Fixed facts:

- Registry/image: `registry.ubuntu-server.atrico.net/outline`
- Server: `ssh ubuntu-server.atrico.net` (user `rob`, key auth works)
- Compose project: `~/services/outline/compose.yaml`, service `outline`, with
  `image: registry.ubuntu-server.atrico.net/outline:<current>` (an old
  `docker.getoutline.com` image line sits in a comment, leave it alone)
- Run from the repo root in Git Bash. Prefix docker commands that take Linux
  paths with `MSYS_NO_PATHCONV=1`.
- Docker: the default context is the Windows-container daemon, which cannot
  build Outline, and the CLI has no buildx. Use `docker --context wsl ...` (a
  Linux daemon; running any `wsl -e true` wakes the WSL distro if it is
  stopped). Without buildx the legacy builder ignores
  `Dockerfile.test.dockerignore` and `--progress`, so builds use a clean
  context directory instead (below).

## 1. Preconditions

```bash
git status --porcelain          # must be empty; if not, stop and ask
git branch --show-current       # remember it to switch back at the end
```

Rebasing rewrites `kroki_integration`. Record the old tip so it can be
recovered: `OLD=$(git rev-parse kroki_integration)` and tell the user it.

## 2. Find the release commit

The user keeps release tags on the `origin` fork; fall back to upstream if they
are missing there.

```bash
git fetch origin --tags
git rev-parse -q --verify "refs/tags/$TAG^{commit}" \
  || git fetch https://github.com/outline/outline.git "refs/tags/$TAG:refs/tags/$TAG"
COMMIT=$(git rev-parse "refs/tags/$TAG^{commit}")
```

If the tag still cannot be resolved, stop and tell the user. Show
`git log -1 --oneline $COMMIT` so they can see what they are releasing.

## 3. Rebase kroki_integration

```bash
git rebase "$COMMIT" kroki_integration
```

Kroki commits already contained in the release are dropped automatically. On
conflicts, resolve them carefully (the Kroki code is in
`shared/editor/extensions/DiagramService.ts`, `plugins/kroki/`,
`shared/editor/nodes/CodeFence.ts`, `Mermaid.ts`, `Lightbox.ts` and editor
menus), then `git rebase --continue`. If a conflict is not obviously
mechanical, show it to the user rather than guessing; `git rebase --abort`
restores the old state. Do not push — the user did not ask for it and the
rebase needs a force push; mention that at the end.

## 4. Set the version string

The rebase brings in upstream's `package.json` version (`1.12.0`). Set it to
`VERSION` so the app reports the same version as the image tag (the sidebar
shows `v<version>`, and API clients and exports include it). Nothing parses it
as strict semver, so the four-part form is safe. Commit it on the branch so the
`git archive` used for the builds below contains it.

```bash
git switch kroki_integration
sed -i -E "s/^  \"version\": \".*\",/  \"version\": \"$VERSION\",/" package.json
git diff --stat                 # only package.json, one line
git add package.json
git commit -m "chore: Set version to $VERSION" \
  -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

Do this before building: it changes `package.json`, which invalidates the
cached `yarn install` layer, so the first build after it is the slow one.

## 5. Build and test

There is no local `node_modules`, so type-check and tests run inside Docker via
`Dockerfile.test` in this skill's directory (its sibling `.dockerignore` keeps
test files in the build context, unlike the repo's own). It installs
dependencies, runs `yarn tsc --noEmit`, then the Kroki-related unit tests.

Collect the test files that the branch adds or changes relative to the release,
excluding `server/` tests (they need Postgres/Redis):

```bash
S=.claude/skills/release-outline
CTX=/tmp/outline-release-ctx          # clean copy of the committed branch
rm -rf $CTX && mkdir -p $CTX && git archive kroki_integration | tar -x -C $CTX
cp $S/Dockerfile.test $CTX/Dockerfile && cp $S/Dockerfile.test.dockerignore $CTX/.dockerignore
TESTS=$(git diff --name-only "$COMMIT" kroki_integration -- '*.test.ts' '*.test.tsx' | grep -v '^server/' | tr '\n' ' ')
(cd $CTX && docker --context wsl build --build-arg "TEST_FILES=$TESTS" -t outline-kroki-test:$VERSION .)
```

Rebases commonly break the Kroki code silently: upstream changes (v1.12.0
removed `isDark` from `Mermaid(...)` and made the renderer read
`editor.props.theme`) auto-merge into duplicate parameters or stale call
sites, which `tsc` catches, and test mocks that miss new props. Read the vitest
summary for "Unhandled Errors" even when the exit code is 0.

A failing `tsc` or test fails the build. Fix real regressions caused by the
rebase on the branch (amend or add a commit) and rerun; if the failure also
exists on the plain upstream tag, say so and ask before continuing.

Then build the production image — the same two-stage build the repo uses
(`Dockerfile.base` runs `yarn build`; `Dockerfile` copies the result into the
slim runner):

```bash
IMAGE=registry.ubuntu-server.atrico.net/outline
# Build from a clean checkout of the branch; the repo's own .dockerignore applies
rm -rf $CTX && mkdir -p $CTX && git archive kroki_integration | tar -x -C $CTX && cd $CTX
docker --context wsl build -f Dockerfile.base -t outline-base:$VERSION .
docker --context wsl build --build-arg BASE_IMAGE=outline-base:$VERSION -t $IMAGE:$VERSION .
```

## 6. Push

```bash
docker --context wsl push $IMAGE:$VERSION
```

If it fails with an auth error, the machine is not logged in. Ask the user to
run `! docker login registry.ubuntu-server.atrico.net` in the prompt (never
invent credentials), then retry.

## 7. Deploy on ubuntu-server

Existing database data is the thing at risk here, and Outline runs migrations on
start, so record the current tag first for rollback and make sure the volume
backup exists (`~/services/outline/backups`).

```bash
ssh ubuntu-server.atrico.net 'cd ~/services/outline && grep -n "registry.ubuntu-server.atrico.net/outline:" compose.yaml'
```

Note the previous tag. Replace only that line's tag, then roll out:

```bash
ssh ubuntu-server.atrico.net "cd ~/services/outline \
  && sed -i -E 's#^(\s*image:\s*registry\.ubuntu-server\.atrico\.net/outline:).*#\1$VERSION#' compose.yaml \
  && grep -n 'outline:$VERSION' compose.yaml \
  && docker compose pull outline && docker compose up -d outline"
```

Verify: wait for the container to be healthy
(`docker inspect -f '{{.State.Health.Status}}' outline`), `docker logs --tail 30
outline` shows no migration/start errors, and
`curl -fsS https://outline.ubuntu-server.atrico.net/_health` returns OK. If it
does not come up, roll back by setting the previous tag in `compose.yaml` and
running `docker compose up -d outline` again, and report the failure.

## 8. Wrap up

Switch back to the original branch (`git switch <original>`) and report: tag,
release commit, old and new `kroki_integration` tips, test counts, image digest,
and the deployed health check. Mention that `kroki_integration` was rebased but
not pushed (push needs `--force-with-lease`), and that the old tip is `$OLD`.
