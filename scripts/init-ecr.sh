#!/usr/bin/env bash

set -euo pipefail

readonly AWS_PROFILE_NAME="internal-tools"
readonly AWS_REGION_NAME="us-east-1"
readonly REPOSITORIES=("outline-base" "outline")

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command not found: $command_name" >&2
    exit 1
  fi
}

require_command aws

account_id="$(
  aws sts get-caller-identity \
    --profile "$AWS_PROFILE_NAME" \
    --region "$AWS_REGION_NAME" \
    --query Account \
    --output text
)"
registry="${account_id}.dkr.ecr.${AWS_REGION_NAME}.amazonaws.com"

for repository in "${REPOSITORIES[@]}"; do
  if aws ecr describe-repositories \
    --profile "$AWS_PROFILE_NAME" \
    --region "$AWS_REGION_NAME" \
    --repository-names "$repository" \
    >/dev/null 2>&1; then
    echo "ECR repository already exists: ${registry}/${repository}"
    continue
  fi

  aws ecr create-repository \
    --profile "$AWS_PROFILE_NAME" \
    --region "$AWS_REGION_NAME" \
    --repository-name "$repository" \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256 \
    >/dev/null

  echo "Created ECR repository: ${registry}/${repository}"
done

echo
echo "ECR initialization complete."
echo "For Docker Compose, export:"
echo "  export ECR_REGISTRY=${registry}"
echo "  export IMAGE_TAG=latest"
