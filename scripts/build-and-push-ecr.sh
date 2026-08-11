#!/usr/bin/env bash

set -euo pipefail

readonly AWS_PROFILE_NAME="internal-tools"
readonly AWS_REGION_NAME="us-east-1"
readonly BASE_REPOSITORY="outline-base"
readonly APP_REPOSITORY="outline"
readonly IMAGE_TAG="${1:-${IMAGE_TAG:-latest}}"
readonly DOCKER_PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command not found: $command_name" >&2
    exit 1
  fi
}

require_command aws
require_command docker

account_id="$(
  aws sts get-caller-identity \
    --profile "$AWS_PROFILE_NAME" \
    --region "$AWS_REGION_NAME" \
    --query Account \
    --output text
)"
registry="${account_id}.dkr.ecr.${AWS_REGION_NAME}.amazonaws.com"
base_image="${registry}/${BASE_REPOSITORY}:${IMAGE_TAG}"
app_image="${registry}/${APP_REPOSITORY}:${IMAGE_TAG}"

for repository in "$BASE_REPOSITORY" "$APP_REPOSITORY"; do
  if ! aws ecr describe-repositories \
    --profile "$AWS_PROFILE_NAME" \
    --region "$AWS_REGION_NAME" \
    --repository-names "$repository" \
    >/dev/null 2>&1; then
    echo "ECR repository does not exist: ${registry}/${repository}" >&2
    echo "Run scripts/init-ecr.sh first." >&2
    exit 1
  fi
done

aws ecr get-login-password \
  --profile "$AWS_PROFILE_NAME" \
  --region "$AWS_REGION_NAME" |
  docker login \
    --username AWS \
    --password-stdin "$registry"

echo "Building ${base_image} for ${DOCKER_PLATFORM}"
docker build \
  --platform "$DOCKER_PLATFORM" \
  --file Dockerfile.base \
  --tag "$base_image" \
  .
docker push "$base_image"

echo "Building ${app_image} for ${DOCKER_PLATFORM}"
docker build \
  --platform "$DOCKER_PLATFORM" \
  --file Dockerfile \
  --build-arg "BASE_IMAGE=${base_image}" \
  --tag "$app_image" \
  .
docker push "$app_image"

echo
echo "Published:"
echo "  ${base_image}"
echo "  ${app_image}"
echo
echo "Run the ECR image with Docker Compose:"
echo "  ECR_REGISTRY=${registry} IMAGE_TAG=${IMAGE_TAG} docker compose --profile ecr up"
