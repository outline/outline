#!/usr/bin/env bash

# Shared AWS credential and region resolution for the ECR scripts.
#
# Credentials come from the ambient chain by default, so an EC2 instance role,
# ECS task role, or environment credentials are used with no configuration.
# Setting AWS_PROFILE to a non-empty value selects that named profile instead.

AWS_REGION_NAME="${AWS_REGION:-us-east-1}"
AWS_PROFILE_NAME="${AWS_PROFILE:-}"

# Fails with a readable message when a required binary is missing.
require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command not found: $command_name" >&2
    exit 1
  fi
}

# Runs the AWS CLI with the resolved profile and region applied.
aws_cli() {
  if [[ -n "$AWS_PROFILE_NAME" ]]; then
    aws --profile "$AWS_PROFILE_NAME" --region "$AWS_REGION_NAME" "$@"
    return
  fi

  aws --region "$AWS_REGION_NAME" "$@"
}

# Describes which credentials are in use, so failures are easy to diagnose.
describe_credential_source() {
  if [[ -n "$AWS_PROFILE_NAME" ]]; then
    echo "Authenticating with AWS profile \"${AWS_PROFILE_NAME}\" in ${AWS_REGION_NAME}"
    return
  fi

  echo "Authenticating with ambient AWS credentials (instance role, task role, or environment) in ${AWS_REGION_NAME}"
}

# Prints the account id for the resolved credentials.
resolve_account_id() {
  local account_id

  if ! account_id="$(aws_cli sts get-caller-identity --query Account --output text 2>/dev/null)"; then
    echo "Unable to resolve AWS credentials." >&2
    echo "Attach a role to this instance, export credentials into the" >&2
    echo "environment, or set AWS_PROFILE to a configured profile." >&2
    exit 1
  fi

  printf '%s' "$account_id"
}

require_command aws
