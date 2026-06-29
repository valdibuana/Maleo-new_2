import re

files_patches = {
    r"d:\0- Projek Maleo\New_websiakad\maleo-new\web\src\components\ui\Sidebar.tsx": [
        (r'localStorage\.removeItem\("jwt_token"\);\s*localStorage\.removeItem\("refresh_token"\);\s*localStorage\.removeItem\("user"\);\s*Cookies\.remove\("jwt_token"\);\s*Cookies\.remove\("refresh_token"\);\s*Cookies\.remove\("user_role"\);\s*router\.push\("\/login"\);\s*\n\s*\}\s*\n\s*\};',
         'performLogout();\n    }\n  };'),
    ],
    r"d:\0- Projek Maleo\New_websiakad\maleo-new\web\src\components\hub\HubSidebar.tsx": [
        (r'localStorage\.removeItem\("jwt_token"\);\s*localStorage\.removeItem\("refresh_token"\);\s*localStorage\.removeItem\("user"\);\s*Cookies\.remove\("jwt_token"\);\s*Cookies\.remove\("refresh_token"\);\s*Cookies\.remove\("user_role"\);\s*router\.push\("\/login"\);\s*\n\s*\}\s*\n\s*\};',
         'performLogout();\n    }\n  };'),
    ],
    r"d:\0- Projek Maleo\New_websiakad\maleo-new\web\src\components\ui\Topbar.tsx": [
        (r'\/\/ 3\. Hapus semua kredensial\s*\n\s*localStorage\.removeItem\("jwt_token"\);\s*localStorage\.removeItem\("refresh_token"\);\s*localStorage\.removeItem\("user"\);\s*Cookies\.remove\("jwt_token"\);\s*Cookies\.remove\("refresh_token"\);\s*Cookies\.remove\("user_role"\);\s*\/\/ 4\. Redirect ke login\s*\n\s*router\.push\("\/login"\);\s*\n\s*\}\s*\n\s*\};',
         'performLogout();\n    }\n  };'),
    ]
}

changed = 0
for filepath, patches in files_patches.items():
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    for pattern, replacement in patches:
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        changed += 1
        print(f'PATCHED: {filepath.split(chr(92))[-1]}')
    else:
        print(f'MISSING: {filepath.split(chr(92))[-1]}')

print(f'Total patched: {changed}')
