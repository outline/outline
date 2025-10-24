# Enhanced Farsi Translation: EN vs FA i18n Update

## Overview

This document summarizes the recent updates and improvements made to the Farsi (`fa_IR`) translations in our project, based on the English (`en_US`) reference. The goal is to ensure **full consistency, completeness, and accuracy** of the Farsi translations while maintaining proper placeholder usage and structure.

---

## What We Did

### Added Missing Keys and Reconciled Extra Keys

- Compared all key paths between English (`en_US`) and Farsi (`fa_IR`) JSON files.
- Identified missing keys in FA that exist in EN and added them.
- Found extra keys in FA that are not in EN for potential cleanup.

### Farsi Localization

- Translated all missing or previously untranslated keys using the **closest and most meaningful Farsi terms**, while preserving the original intent and context.
- Ensured translations are consistent and natural in the context of the application.

### Testing the Translation with i18n Consistency Check Script

- Developed and used a **full i18n validation script** (bash + Python) to verify translations.
- This script performs the following checks:
  - Missing or extra keys
  - Top-level key order differences (if applicable)
  - Untranslated keys (FA value == EN value)
  - Empty or blank FA values (after trimming whitespace)
  - Placeholder mismatches (`{{ }}`)
- Outputs are saved in `/tmp/i18n_check` for review.

---

## Script Highlights

```bash
#!/bin/bash
# i18n consistency check script (EN vs FA) - Full & Fixed
# ============================================================
# Purpose: Validate FA translations against EN
# Checks:
#   - Missing/extra keys
#   - Top-level key order differences
#   - Untranslated keys (FA == EN)
#   - Empty/blank FA values
#   - Placeholder mismatches ({{ }})
# Outputs: /tmp/i18n_check
# ============================================================

# Pre-flight check for required tools
command -v jq >/dev/null 2>&1 || { echo "ERROR: jq required"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "ERROR: python3 required"; exit 1; }

# Clean previous outputs
rm -rf /tmp/i18n_check
mkdir -p /tmp/i18n_check

# Steps:
# 1. Extract all key paths
# 2. Compare keys (missing/extra)
# 3. Check top-level key order
# 4. Extract leaf key-value pairs
# 5. Check untranslated keys (FA == EN)
# 6. Check empty or blank FA values
# 7. Check placeholder mismatches ({{ }})
# All steps implemented using jq, bash, and Python
