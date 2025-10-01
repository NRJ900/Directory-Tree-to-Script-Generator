class DirectoryTreeParser {
    constructor() {
        this.supportedTreeCharacters = ['├──', '│', '└──', '├─', '└─', '╣', '║', '╚', '╬', '├', '└', '│'];
        this.fileExtensions = ['.py', '.js', '.json', '.txt', '.md', '.html', '.css', '.xml', '.yml', '.yaml', '.conf', '.ini', '.ts', '.jsx', '.tsx', '.php', '.rb', '.go', '.rs', '.cpp', '.c', '.java', '.kt', '.swift'];
        this.structure = [];
        this.directories = new Set();
        this.files = new Set();
    }

    parse(input) {
        this.structure = [];
        this.directories = new Set();
        this.files = new Set();

        if (!input.trim()) {
            throw new Error('Input cannot be empty');
        }

        const lines = input.split('\n').filter(line => line.trim() !== '');
        const directoryStack = []; // Track current directory path components
        let rootDirSet = false;
        let rootDir = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Skip comment lines
            if (line.trim().startsWith('#')) {
                continue;
            }

            const parsed = this.parseLine(line);
            if (!parsed) continue;

            const { name, level, isFile } = parsed;
            
            // Set root directory from first entry if not already set
            if (!rootDirSet) {
                rootDir = name.endsWith('/') ? name.slice(0, -1) : name;
                rootDirSet = true;
                
                // If first entry is not at level 0, treat it as root
                if (level === 0 && !isFile) {
                    const dirName = name.endsWith('/') ? name.slice(0, -1) : name;
                    this.directories.add(dirName);
                    directoryStack.push(dirName);
                    continue;
                }
            }

            // Adjust directory stack based on current indentation level
            // Pop directories until stack size matches current level
            while (directoryStack.length > level) {
                directoryStack.pop();
            }

            if (isFile) {
                // Build full path for file using current directory stack
                const filePath = directoryStack.length > 0 
                    ? `${directoryStack.join('/')}/${name}` 
                    : name;
                this.files.add(filePath);
                
                this.structure.push({
                    name: name,
                    level: level,
                    isFile: true,
                    fullPath: filePath
                });
            } else {
                // Handle directory
                const dirName = name.endsWith('/') ? name.slice(0, -1) : name;
                const dirPath = directoryStack.length > 0 
                    ? `${directoryStack.join('/')}/${dirName}` 
                    : dirName;
                
                this.directories.add(dirPath);
                
                // Add this directory to the stack for subsequent items
                if (directoryStack.length === level) {
                    directoryStack.push(dirName);
                } else {
                    // Ensure stack is at correct level
                    while (directoryStack.length > level) {
                        directoryStack.pop();
                    }
                    directoryStack.push(dirName);
                }

                this.structure.push({
                    name: name,
                    level: level,
                    isFile: false,
                    fullPath: dirPath
                });
            }
        }

        return {
            structure: this.structure,
            directories: Array.from(this.directories),
            files: Array.from(this.files),
            rootDir: rootDir
        };
    }

    parseLine(line) {
        if (!line.trim()) return null;

        // Calculate indentation level by analyzing tree structure
        let level = 0;
        let cleanLine = line;

        // Method 1: Count tree character depth
        const treeMatches = line.match(/^([\s│]*)(├|└)/);
        if (treeMatches) {
            const prefix = treeMatches[1] || '';
            // Count │ characters and spaces to determine depth
            const pipeCount = (prefix.match(/│/g) || []).length;
            const spaceGroups = prefix.replace(/│/g, '').length;
            level = pipeCount + (spaceGroups > 0 ? Math.ceil(spaceGroups / 4) : 0);
        } else {
            // Method 2: Count leading spaces (fallback)
            const leadingSpaces = line.match(/^ */)[0].length;
            level = Math.floor(leadingSpaces / 4); // Assume 4 spaces per level for non-tree format
        }

        // Remove all tree drawing characters and clean the line
        cleanLine = line
            .replace(/^[\s├└│╣║╚╬─┌┐┘└┴┬┤├]*/, '')
            .replace(/^[\s─]*(.*?)[\s]*$/, '$1')
            .trim();

        if (!cleanLine) return null;

        // Determine if it's a file or directory
        const isFile = this.isFileEntry(cleanLine);

        return {
            name: cleanLine,
            level: level,
            isFile: isFile
        };
    }

    isFileEntry(name) {
        // Files end with extensions, directories typically end with / or have no extension
        if (name.endsWith('/')) return false;
        
        // Check if the name contains a file extension
        const lastDot = name.lastIndexOf('.');
        if (lastDot === -1) return false;
        
        const extension = name.substring(lastDot).toLowerCase();
        const extensionLength = extension.length;
        
        // Check against known extensions or reasonable extension pattern
        return this.fileExtensions.includes(extension) || 
               (lastDot > 0 && extensionLength >= 2 && extensionLength <= 6);
    }
}

class ScriptGenerator {
    static generatePython(directories, files, rootDir = '') {
        const prefix = rootDir ? `${rootDir}/` : '';
        let script = `import os\n\n# Create directory structure\n# Generated by Directory Tree Generator\n\n`;
        
        // Create directories first
        if (directories.length > 0) {
            script += `# Create directories\n`;
            directories.forEach(dir => {
                const fullPath = `${prefix}${dir}`.replace(/\/+/g, '/');
                script += `os.makedirs('${fullPath}', exist_ok=True)\n`;
            });
            script += `\n`;
        }

        // Create files
        if (files.length > 0) {
            script += `# Create files\n`;
            files.forEach(file => {
                const fullPath = `${prefix}${file}`.replace(/\/+/g, '/');
                script += `with open('${fullPath}', 'w') as f:\n    pass  # Empty file\n`;
            });
        }

        script += `\nprint("Directory structure created successfully!")\n`;
        return script;
    }

    static generateBash(directories, files, rootDir = '') {
        const prefix = rootDir ? `${rootDir}/` : '';
        let script = `#!/bin/bash\n# Create directory structure\n# Generated by Directory Tree Generator\n\n`;
        
        script += `set -e\necho "Creating directory structure..."\n\n`;

        // Create directories first
        if (directories.length > 0) {
            script += `# Create directories\n`;
            directories.forEach(dir => {
                const fullPath = `${prefix}${dir}`.replace(/\/+/g, '/');
                script += `mkdir -p "${fullPath}"\n`;
            });
            script += `\n`;
        }

        // Create files
        if (files.length > 0) {
            script += `# Create files\n`;
            files.forEach(file => {
                const fullPath = `${prefix}${file}`.replace(/\/+/g, '/');
                script += `touch "${fullPath}"\n`;
            });
        }

        script += `\necho "Directory structure created successfully!"\n`;
        return script;
    }

    static generateWindows(directories, files, rootDir = '') {
        const prefix = rootDir ? `${rootDir}\\` : '';
        let script = `@echo off\nREM Create directory structure\nREM Generated by Directory Tree Generator\n\n`;
        
        script += `echo Creating directory structure...\n\n`;

        // Create directories first
        if (directories.length > 0) {
            script += `REM Create directories\n`;
            directories.forEach(dir => {
                const fullPath = `${prefix}${dir}`.replace(/\//g, '\\').replace(/\\+/g, '\\');
                script += `if not exist "${fullPath}" mkdir "${fullPath}"\n`;
            });
            script += `\n`;
        }

        // Create files
        if (files.length > 0) {
            script += `REM Create files\n`;
            files.forEach(file => {
                const fullPath = `${prefix}${file}`.replace(/\//g, '\\').replace(/\\+/g, '\\');
                script += `if not exist "${fullPath}" type nul > "${fullPath}"\n`;
            });
        }

        script += `\necho Directory structure created successfully!\npause\n`;
        return script;
    }
}

class DirectoryTreeApp {
    constructor() {
        this.parser = new DirectoryTreeParser();
        this.currentScript = '';
        this.currentLanguage = 'python';
        this.sampleInput = `my-project/
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
└─ README.md`;

        this.initializeElements();
        this.bindEvents();
        this.updatePreview();
    }

    initializeElements() {
        this.treeInput = document.getElementById('treeInput');
        this.outputType = document.getElementById('outputType');
        this.rootName = document.getElementById('rootName');
        this.generateBtn = document.getElementById('generateBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.loadExampleBtn = document.getElementById('loadExampleBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.outputCode = document.getElementById('outputCode');
        this.structurePreview = document.getElementById('structurePreview');
        this.statusMessage = document.getElementById('statusMessage');
    }

    bindEvents() {
        this.generateBtn.addEventListener('click', () => this.generateScript());
        this.clearBtn.addEventListener('click', () => this.clearAll());
        this.loadExampleBtn.addEventListener('click', () => this.loadExample());
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.downloadBtn.addEventListener('click', () => this.downloadScript());
        
        this.treeInput.addEventListener('input', () => this.updatePreview());
        this.outputType.addEventListener('change', () => {
            this.currentLanguage = this.outputType.value;
            if (this.currentScript) {
                this.updateSyntaxHighlighting();
            }
        });
    }

    generateScript() {
        try {
            const input = this.treeInput.value.trim();
            if (!input) {
                throw new Error('Please enter a directory tree structure');
            }

            this.setLoading(true);
            
            const parsed = this.parser.parse(input);
            const rootDir = this.rootName.value.trim() || parsed.rootDir;
            const outputType = this.outputType.value;
            
            let script = '';
            let language = 'python';
            
            switch (outputType) {
                case 'python':
                    script = ScriptGenerator.generatePython(parsed.directories, parsed.files, rootDir);
                    language = 'python';
                    break;
                case 'bash':
                    script = ScriptGenerator.generateBash(parsed.directories, parsed.files, rootDir);
                    language = 'bash';
                    break;
                case 'windows':
                    script = ScriptGenerator.generateWindows(parsed.directories, parsed.files, rootDir);
                    language = 'batch';
                    break;
                default:
                    throw new Error('Invalid output type selected');
            }

            this.currentScript = script;
            this.currentLanguage = language;
            this.displayScript(script, language);
            this.copyBtn.disabled = false;
            this.downloadBtn.disabled = false;
            
            this.showStatus('Script generated successfully!', 'success');
            
        } catch (error) {
            this.showStatus(`Error: ${error.message}`, 'error');
            this.treeInput.classList.add('error');
            setTimeout(() => this.treeInput.classList.remove('error'), 3000);
        } finally {
            this.setLoading(false);
        }
    }

    displayScript(script, language) {
        const codeElement = this.outputCode.querySelector('code');
        codeElement.textContent = script;
        codeElement.className = `language-${language}`;
        
        if (window.Prism) {
            Prism.highlightElement(codeElement);
        }
    }

    updateSyntaxHighlighting() {
        if (this.currentScript && window.Prism) {
            this.displayScript(this.currentScript, this.currentLanguage);
        }
    }

    updatePreview() {
        try {
            const input = this.treeInput.value.trim();
            if (!input) {
                this.structurePreview.textContent = 'Enter directory tree structure to see preview...';
                return;
            }

            const parsed = this.parser.parse(input);
            let preview = 'Parsed Structure Preview:\n\n';
            
            if (parsed.directories.length > 0) {
                preview += 'Directories to be created:\n';
                parsed.directories.sort().forEach(dir => {
                    preview += `📁 ${dir}\n`;
                });
                preview += '\n';
            }

            if (parsed.files.length > 0) {
                preview += 'Files to be created:\n';
                parsed.files.sort().forEach(file => {
                    preview += `📄 ${file}\n`;
                });
            }

            if (parsed.directories.length === 0 && parsed.files.length === 0) {
                preview += 'No valid directories or files detected.\nCheck your input format.';
            }

            this.structurePreview.innerHTML = this.formatPreview(preview);
            
        } catch (error) {
            this.structurePreview.textContent = `Preview error: ${error.message}`;
        }
    }

    formatPreview(text) {
        return text
            .replace(/📁 (.+)/g, '<span class="preview-folder">📁 $1</span>')
            .replace(/📄 (.+)/g, '<span class="preview-file">📄 $1</span>');
    }

    async copyToClipboard() {
        if (!this.currentScript) return;

        try {
            await navigator.clipboard.writeText(this.currentScript);
            
            const originalText = this.copyBtn.textContent;
            this.copyBtn.textContent = 'Copied!';
            this.copyBtn.classList.add('btn-copied');
            
            setTimeout(() => {
                this.copyBtn.textContent = originalText;
                this.copyBtn.classList.remove('btn-copied');
            }, 2000);
            
            this.showStatus('Script copied to clipboard!', 'success');
        } catch (error) {
            this.showStatus('Failed to copy to clipboard', 'error');
        }
    }

    downloadScript() {
        if (!this.currentScript) return;

        const outputType = this.outputType.value;
        let filename = 'create_structure';
        let mimeType = 'text/plain';

        switch (outputType) {
            case 'python':
                filename += '.py';
                mimeType = 'text/x-python';
                break;
            case 'bash':
                filename += '.sh';
                mimeType = 'application/x-sh';
                break;
            case 'windows':
                filename += '.bat';
                mimeType = 'application/x-msdos-program';
                break;
        }

        const blob = new Blob([this.currentScript], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showStatus(`Script downloaded as ${filename}`, 'success');
    }

    clearAll() {
        this.treeInput.value = '';
        this.rootName.value = '';
        this.outputCode.querySelector('code').textContent = 'Click "Generate Script" to see the output here...';
        this.outputCode.querySelector('code').className = 'language-python';
        this.structurePreview.textContent = 'Enter directory tree structure to see preview...';
        this.currentScript = '';
        this.copyBtn.disabled = true;
        this.downloadBtn.disabled = true;
        this.treeInput.classList.remove('error');
        this.hideStatus();
    }

    loadExample() {
        this.treeInput.value = this.sampleInput;
        this.updatePreview();
        this.showStatus('Example loaded! Click Generate to create the script.', 'success');
    }

    setLoading(loading) {
        if (loading) {
            this.generateBtn.classList.add('loading');
            this.generateBtn.disabled = true;
        } else {
            this.generateBtn.classList.remove('loading');
            this.generateBtn.disabled = false;
        }
    }

    showStatus(message, type = 'info') {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message ${type}`;
        this.statusMessage.classList.remove('hidden');

        setTimeout(() => {
            this.hideStatus();
        }, 4000);
    }

    hideStatus() {
        this.statusMessage.classList.add('hidden');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DirectoryTreeApp();
});