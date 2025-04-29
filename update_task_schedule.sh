#!/bin/bash

# This script updates all instances of TaskName.schedule to new TaskName().schedule
# It excludes Event.schedule calls as they are not related to BaseTask

# Function to update a file
update_file() {
  local file=$1
  local task_name=$2
  
  # Skip if it's an Event.schedule call
  if [[ "$task_name" == "Event" ]]; then
    return
  fi
  
  # Skip if it's already using the new pattern
  if grep -q "new $task_name()" "$file"; then
    echo "File $file already using new pattern for $task_name"
    return
  fi
  
  # Update the pattern
  sed -i "s/await $task_name\.schedule(/await new $task_name()\.schedule(/g" "$file"
  echo "Updated $file for $task_name"
}

# Process all files with .schedule( calls
grep -r "\.schedule(" --include="*.ts" --include="*.tsx" . | grep -v "node_modules" | grep -v "BaseTask.ts" | grep -v "new " | while read -r line; do
  file=$(echo "$line" | cut -d':' -f1)
  
  # Extract the task name
  if [[ "$line" =~ await\ ([A-Za-z0-9]+)\.schedule\( ]]; then
    task_name="${BASH_REMATCH[1]}"
    update_file "$file" "$task_name"
  elif [[ "$line" =~ ([A-Za-z0-9]+)\.schedule\( ]]; then
    task_name="${BASH_REMATCH[1]}"
    update_file "$file" "$task_name"
  fi
done

# Run lint to fix any formatting issues
yarn lint --fix

