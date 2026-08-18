#!/usr/bin/env bash

# Creates the ECR repositories used by the Outline images.
#
# Credentials come from the ambient chain by default, so an EC2 instance role
# works with no configuration. Set AWS_PROFILE to use a named profile instead.
#
# Usage:
#   ./scripts/init-ecr.sh                             # instance role or environment
#   AWS_PROFILE=internal-tools ./scripts/init-ecr.sh  # named profile
#   AWS_REGION=us-west-2 ./scripts/init-ecr.sh

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/aws.sh
source "${SCRIPT_DIR}/lib/aws.sh"

readonly REPOSITORIES=("outline-base" "outline")

describe_credential_source

account_id="$(resolve_account_id)"
registry="${account_id}.dkr.ecr.${AWS_REGION_NAME}.amazonaws.com"

for repository in "${REPOSITORIES[@]}"; do
  if aws_cli ecr describe-repositories --repository-names "$repository" >/dev/null 2>&1; then
    echo "ECR repository already exists: ${registry}/${repository}"
    continue
  fi

  aws_cli ecr create-repository \
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
