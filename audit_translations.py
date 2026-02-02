import os
import re
import json

# Paths
PROJECT_ROOT = '/Users/abdr/Dev/work/outline'
DIRS_TO_SCAN = ['app', 'shared', 'server', 'plugins']
RU_PATH = os.path.join(PROJECT_ROOT, 'shared/i18n/locales/ru_RU/translation.json')
KK_PATH = os.path.join(PROJECT_ROOT, 'shared/i18n/locales/kk_KZ/translation.json')

# Regex patterns
# t("string") or t('string')
PATTERN_T = re.compile(r'\bt\s*\(\s*["\']([^"\']+)["\']\s*\)')
# i18n.t("string")
PATTERN_I18N = re.compile(r'i18n\.t\s*\(\s*["\']([^"\']+)["\']\s*\)')
# <Trans>string</Trans> (simple case)
PATTERN_TRANS = re.compile(r'<Trans[^>]*>([^<]+)</Trans>')

def extract_keys():
    keys = set()
    files_scanned = 0
    for d in DIRS_TO_SCAN:
        path = os.path.join(PROJECT_ROOT, d)
        for root, _, files in os.walk(path):
            for file in files:
                if file.endswith('.ts') or file.endswith('.tsx'):
                    files_scanned += 1
                    full_path = os.path.join(root, file)
                    try:
                        with open(full_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            # Find all matches
                            keys.update(PATTERN_T.findall(content))
                            keys.update(PATTERN_I18N.findall(content))
                            # Trans is harder, might capture whitespace. clean it.
                            trans_matches = PATTERN_TRANS.findall(content)
                            for m in trans_matches:
                                keys.add(m.strip())
                    except Exception as e:
                        print(f"Error reading {full_path}: {e}")
    print(f"Scanned {files_scanned} files.")
    print(f"Found {len(keys)} unique keys in code.")
    return keys

def load_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return set(json.load(f).keys())
    except FileNotFoundError:
        print(f"File not found: {path}")
        return set()

def main():
    print("Extracting keys from code...")
    code_keys = extract_keys()
    
    print(f"Loading RU translations from {RU_PATH}...")
    ru_keys = load_json(RU_PATH)
    print(f"Found {len(ru_keys)} keys in RU.")

    print(f"Loading KK translations from {KK_PATH}...")
    kk_keys = load_json(KK_PATH)
    print(f"Found {len(kk_keys)} keys in KK.")

    # Analysis
    missing_ru = code_keys - ru_keys
    missing_kk = code_keys - kk_keys
    
    # Also check keys present in RU but missing in KK (since RU seems more complete)
    ru_not_in_kk = ru_keys - kk_keys
    kk_not_in_ru = kk_keys - ru_keys

    print("\n--- AUDIT REPORT ---\n")
    
    print(f"Keys in code BUT MISSING in RU: {len(missing_ru)}")
    # if len(missing_ru) > 0:
    #     print("Sample missing in RU:", list(missing_ru)[:5])

    print(f"Keys in code BUT MISSING in KK: {len(missing_kk)}")
    # if len(missing_kk) > 0:
    #     print("Sample missing in KK:", list(missing_kk)[:5])

    print(f"\nKeys in RU BUT MISSING in KK (Cross-check): {len(ru_not_in_kk)}")
    # if len(ru_not_in_kk) > 0:
        # print("Sample RU not in KK:", list(ru_not_in_kk)[:5])

    # Save details to file
    report = {
        "missing_in_ru": sorted(list(missing_ru)),
        "missing_in_kk": sorted(list(missing_kk)),
        "ru_but_not_kk": sorted(list(ru_not_in_kk))
    }
    
    with open('audit_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print("\nDetailed report saved to audit_report.json")

if __name__ == "__main__":
    main()
