#!/usr/bin/env bash

# Builds the Outline base and application images and pushes them to ECR.
#
# Credentials come from the ambient chain by default, so an EC2 instance role
# works with no configuration. Set AWS_PROFILE to use a named profile instead.
#
# Usage:
#   ./scripts/build-and-push-ecr.sh [image-tag]
#   AWS_PROFILE=internal-tools ./scripts/build-and-push-ecr.sh v1.2.3
#   DOCKER_PLATFORM=linux/arm64 ./scripts/build-and-push-ecr.sh

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/aws.sh
source "${SCRIPT_DIR}/lib/aws.sh"

REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
readonly REPO_ROOT
readonly BASE_REPOSITORY="outline-base"
readonly APP_REPOSITORY="outline"
readonly IMAGE_TAG="${1:-${IMAGE_TAG:-latest}}"
readonly DOCKER_PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"

require_command docker

describe_credential_source

account_id="$(resolve_account_id)"
registry="${account_id}.dkr.ecr.${AWS_REGION_NAME}.amazonaws.com"
base_image="${registry}/${BASE_REPOSITORY}:${IMAGE_TAG}"
app_image="${registry}/${APP_REPOSITORY}:${IMAGE_TAG}"

for repository in "$BASE_REPOSITORY" "$APP_REPOSITORY"; do
  if ! aws_cli ecr describe-repositories --repository-names "$repository" >/dev/null 2>&1; then
    echo "ECR repository does not exist: ${registry}/${repository}" >&2
    echo "Run scripts/init-ecr.sh first." >&2
    exit 1
  fi
done

aws_cli ecr get-login-password |
  docker login \
    --username AWS \
    --password-stdin "$registry"

# The application image copies node_modules and the compiled build out of the
# base image, so the base must be built from this checkout first.
echo "Building ${base_image} for ${DOCKER_PLATFORM}"
docker build \
  --platform "$DOCKER_PLATFORM" \
  --file "${REPO_ROOT}/Dockerfile.base" \
  --tag "$base_image" \
  "$REPO_ROOT"
docker push "$base_image"

echo "Building ${app_image} for ${DOCKER_PLATFORM}"
docker build \
  --platform "$DOCKER_PLATFORM" \
  --file "${REPO_ROOT}/Dockerfile" \
  --build-arg "BASE_IMAGE=${base_image}" \
  --tag "$app_image" \
  "$REPO_ROOT"
docker push "$app_image"

echo
echo "Published:"
echo "  ${base_image}"
echo "  ${app_image}"
echo
echo "Run the ECR image with Docker Compose:"
echo "  ECR_REGISTRY=${registry} IMAGE_TAG=${IMAGE_TAG} docker compose --profile ecr up"
