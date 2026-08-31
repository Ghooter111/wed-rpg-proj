import json
import re

log_path = r'C:\Users\Dhodi Presetia\.gemini\antigravity-ide\brain\fb612b37-e132-497a-b28a-ce111daa8e7c\.system_generated\logs\transcript_full.jsonl'
lines_dict = {}

with open(log_path, 'r', encoding='utf-8') as f:
    text = f.read()

blocks = text.split('File Path: `file:///d:/Program/Web/main.js`')
if len(blocks) > 1:
    for b in blocks[1:]:
        sub_blocks = b.split('File Path: `')
        main_js_content = sub_blocks[0]
        
        parts = re.split(r'\\r\\n|\\n|\r\n|\n', main_js_content)
        for p in parts:
            match = re.match(r'^(\d+):\s?(.*)', p) # Note \s? to handle empty lines like "30:"
            if match:
                line_num = int(match.group(1))
                content = match.group(2)
                content = content.replace('\\"', '"').replace('\\\\', '\\')
                if line_num not in lines_dict:
                    lines_dict[line_num] = content

    max_line = max(lines_dict.keys()) if lines_dict else 0
    print(f'Found {len(lines_dict)} unique lines. Max line: {max_line}')
    
    with open('main.js.restored', 'w', encoding='utf-8') as out:
        for i in range(1, max_line + 1):
            if i in lines_dict:
                out.write(lines_dict[i] + '\n')
            else:
                out.write('// MISSING LINE ' + str(i) + '\n')
else:
    print('main.js view not found')
