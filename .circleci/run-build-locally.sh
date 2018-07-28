#!/usr/bin/env bash
curl --user ${CIRCLE_TOKEN}: \
    --request POST \
    --form revision=<ENTER COMMIT SHA HERE>\
    --form config=@config.yml \
    --form notify=false \
        https://circleci.com/api/v1.1/project/github/outline/outline/tree/master