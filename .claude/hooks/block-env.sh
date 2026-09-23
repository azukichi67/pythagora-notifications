#!/usr/bin/env bash
# Bash/PowerShell ツール経由での .env 参照を拒否する（permissions.deny の Read は shell を止めないため）
command=$(jq -r '.tool_input.command // empty')

if printf '%s' "$command" | grep -Eq '\.env([^A-Za-z0-9_]|$)'; then
  echo ".env ファイルへのアクセスは hook により拒否されている" >&2
  exit 2
fi

exit 0
