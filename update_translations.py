import os
import re
import json

# Paths
PROJECT_ROOT = '/Users/abdr/Dev/work/outline'
DIRS_TO_SCAN = ['app', 'shared', 'server', 'plugins']
EN_PATH = os.path.join(PROJECT_ROOT, 'shared/i18n/locales/en_US/translation.json')
RU_PATH = os.path.join(PROJECT_ROOT, 'shared/i18n/locales/ru_RU/translation.json')
KK_PATH = os.path.join(PROJECT_ROOT, 'shared/i18n/locales/kk_KZ/translation.json')

# KNOWN TRANSLATIONS (Recovered from refactor)
KNOWN_RU = {
    "Select editor": "Выберите редактора",
    "Reminder updated": "Напоминание обновлено",
    "Reminder created": "Напоминание создано",
    "Could not update reminder": "Не удалось обновить напоминание",
    "Could not create reminder": "Не удалось создать напоминание",
    "Once": "Одноразовое",
    "Every day": "Каждый день",
    "Every week": "Каждую неделю",
    "Every month": "Каждый месяц",
    "Edit reminder": "Редактировать напоминание",
    "Create reminder": "Создать напоминание",
    "Editor": "Редактор",
    "Message": "Сообщение",
    "Optional message for the editor": "Необязательное сообщение для редактора",
    "Repeat": "Повторение",
    "Status": "Статус",
    "Active": "Активно",
    "Cancel": "Отмена",
    "Save": "Сохранить",
    "Create": "Создать"
}

KNOWN_KK = {
    "Select editor": "Редакторды таңдаңыз",
    "Reminder updated": "Еске салғыш жаңартылды",
    "Reminder created": "Еске салғыш жасалды",
    "Could not update reminder": "Еске салғышты жаңарту мүмкін емес",
    "Could not create reminder": "Еске салғышты жасау мүмкін емес",
    "Once": "Бір рет",
    "Every day": "Күн сайын",
    "Every week": "Апта сайын",
    "Every month": "Ай сайын",
    "Edit reminder": "Еске салғышты өңдеу",
    "Create reminder": "Еске салғышты жасау",
    "Editor": "Редактор",
    "Message": "Хабарлама",
    "Optional message for the editor": "Редакторға арналған қосымша хабарлама",
    "Repeat": "Қайталау",
    "Status": "Күйі",
    "Active": "Белсенді",
    "Cancel": "Болдырмау",
    "Save": "Сақтау",
    "Create": "Жасау"
}

# Regex patterns
PATTERN_T = re.compile(r'\bt\s*\(\s*["\']([^"\']+)["\']\s*\)')
PATTERN_I18N = re.compile(r'i18n\.t\s*\(\s*["\']([^"\']+)["\']\s*\)')
PATTERN_TRANS = re.compile(r'<Trans[^>]*>([^<]+)</Trans>')

def extract_keys():
    keys = set()
    for d in DIRS_TO_SCAN:
        path = os.path.join(PROJECT_ROOT, d)
        for root, _, files in os.walk(path):
            for file in files:
                if file.endswith('.ts') or file.endswith('.tsx'):
                    full_path = os.path.join(root, file)
                    try:
                        with open(full_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            keys.update(PATTERN_T.findall(content))
                            keys.update(PATTERN_I18N.findall(content))
                            trans_matches = PATTERN_TRANS.findall(content)
                            for m in trans_matches:
                                keys.add(m.strip())
                    except Exception as e:
                        pass
    return sorted(list(keys))

def load_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save_json(path, data):
    # Sort keys alphabetically
    sorted_data = dict(sorted(data.items()))
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(sorted_data, f, indent=2, ensure_ascii=False)
        f.write('\n') # Add newline at end of file

def main():
    print("Extracting keys from code...")
    code_keys = extract_keys()
    print(f"Found {len(code_keys)} unique keys.")

    # 1. Update English
    print(f"Updating English at {EN_PATH}...")
    en_data = load_json(EN_PATH)
    for key in code_keys:
        if key not in en_data:
            en_data[key] = key # English value is the key itself
    save_json(EN_PATH, en_data)

    # 2. Update Russian
    print(f"Updating Russian at {RU_PATH}...")
    ru_data = load_json(RU_PATH)
    for key in code_keys:
        if key not in ru_data:
            # Check known list first
            if key in KNOWN_RU:
                ru_data[key] = KNOWN_RU[key]
            else:
                # Default to English (or empty string if preferred, choosing English for visibility)
                ru_data[key] = key 
    save_json(RU_PATH, ru_data)

    # 3. Update Kazakh
    print(f"Updating Kazakh at {KK_PATH}...")
    kk_data = load_json(KK_PATH)
    for key in code_keys:
        if key not in kk_data:
            # Check known list first
            if key in KNOWN_KK:
                kk_data[key] = KNOWN_KK[key]
            else:
                kk_data[key] = key
    save_json(KK_PATH, kk_data)

    print("Done! Translation files updated.")

if __name__ == "__main__":
    main()
