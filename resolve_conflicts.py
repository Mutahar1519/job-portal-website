#!/usr/bin/env python3
import os
import re

def resolve_all_conflicts(content):
    """Recursively resolve all conflict markers by keeping HEAD version."""
    max_iterations = 50
    iterations = 0
    
    # Pattern that matches <<<<<<< ... ======= ... >>>>>>>
    # Using DOTALL to match across lines
    pattern = r'<<<<<<< [^\n]+\n(.*?)\n=======\n(.*?)\n>>>>>>> [^\n]+'
    
    while iterations < max_iterations:
        # Find if any conflicts exist
        if not re.search(pattern, content, re.DOTALL):
            break
        
        # Replace - keep the HEAD version (first group)
        content = re.sub(
            pattern,
            lambda m: m.group(1),
            content,
            flags=re.DOTALL
        )
        iterations += 1
    
    return content

# Walk through all files
resolved_count = 0
remaining_count = 0

for root, dirs, files in os.walk('.'):
    # Skip unwanted directories
    dirs[:] = [d for d in dirs if not d.startswith('.') and d not in 
               ['node_modules', 'uploads', 'test-results', 'playwright-report']]
    
    for file in files:
        filepath = os.path.join(root, file)
        
        # Only process text files
        if file.endswith(('.js', '.css', '.html', '.json', '.md', '.sql', '.env')) or 'example' in file or file == '.gitignore':
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    original = f.read()
                
                if '<<<<<<< ' in original:
                    resolved = resolve_all_conflicts(original)
                    
                    # Write back
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(resolved)
                    
                    # Count remaining conflicts
                    current_remaining = resolved.count('<<<<<<< ')
                    rel_path = filepath.lstrip('.\\').lstrip('./')
                    
                    if current_remaining == 0:
                        print(f'✓ {rel_path}')
                        resolved_count += 1
                    else:
                        print(f'⚠ {rel_path} ({current_remaining} remain)')
                        remaining_count += current_remaining
            except Exception as e:
                pass

print(f"\n✓ Resolved {resolved_count} files")
if remaining_count > 0:
    print(f"⚠ {remaining_count} conflict markers still remain")
else:
    print("✓ All conflicts successfully resolved!")
