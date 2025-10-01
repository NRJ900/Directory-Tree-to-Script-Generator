# Directory-Tree-to-Script-Generator

## Why I Built this?
As AI-powered coding tools and "vibe coding" become the standard for rapid development, developers frequently encounter project setups that require specific file and folder structures. Whether it's setting up a new Tauri app, organizing microservices, or implementing a full-stack architecture, manually creating dozens of nested folders and files is tedious and error-prone. This web application solves that friction by instantly converting directory tree visualizations into executable code. Simply paste your project structure (like those commonly provided in AI-generated code templates), select your preferred output format (Python or Command Prompt), and get ready-to-run scripts that create the entire folder hierarchy with proper file extensions and nesting.


## Usage

Paste your directory tree structure in the input area of the **Directory Tree to Script Generator** web app. Select the output type (Python, Bash, Windows batch) and generate the corresponding folder/file creation script.

### Example Directory Tree Input:

```
my-project/
├─ frontend/
│   ├─ src/
│   ├─ tauri.conf.json
│   └─ package.json
├─ backend/
│   ├─ main.py
│   ├─ handlers/
│   │   ├─ sample1.py
│   │   ├─ sample2.py
│   │   └─ sample3.py
│   ├─ system/
│   │   ├─ app.py
│   │   └─ clipboard.py
│   └─ requirements.txt
└─ README.md
```

### Example Generated Python Script:

```
import os

os.makedirs('my-project/frontend/src', exist_ok=True)
os.makedirs('my-project/backend/handlers', exist_ok=True)
os.makedirs('my-project/backend/system', exist_ok=True)

with open('my-project/frontend/tauri.conf.json', 'w') as f:
    pass  # Empty file

with open('my-project/frontend/package.json', 'w') as f:
    pass  # Empty file

with open('my-project/backend/main.py', 'w') as f:
    pass  # Empty file

with open('my-project/backend/handlers/sample1.py', 'w') as f:
    pass  # Empty file

# ... and so on
```

## License

[MIT License](https://github.com/NRJ900/Directory-Tree-to-Script-Generator/blob/main/LICENSE)


