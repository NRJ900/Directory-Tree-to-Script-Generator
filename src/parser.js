export class DirectoryTreeParser {
    constructor() {
        this.supportedTreeCharacters = ['├──', '│', '└──', '├─', '└─', '╣', '║', '╚', '╬', '├', '└', '│'];
        this.fileExtensions = ['.py', '.js', '.json', '.txt', '.md', '.html', '.css', '.xml', '.yml', '.yaml', '.conf', '.ini', '.ts', '.jsx', '.tsx', '.php', '.rb', '.go', '.rs', '.cpp', '.c', '.java', '.kt', '.swift'];
        this.structure = [];
        this.directories = new Set();
        this.files = new Set();
        this.indentationUnit = 0;
    }

    parse(input) {
        this.structure = [];
        this.directories = new Set();
        this.files = new Set();
        this.indentationUnit = 0;

        if (!input.trim()) {
            throw new Error('Input cannot be empty');
        }

        const lines = input.split('\n').filter(line => line.trim() !== '');
        const directoryStack = []; // Track current directory path components
        let rootDirSet = false;
        let rootDir = '';
        let hasRootWrapper = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Skip comment lines
            if (line.trim().startsWith('#')) {
                continue;
            }

            const parsed = this.parseLine(line);
            if (!parsed) continue;

            const { name, level, isFile, content } = parsed;

            // Set root directory from first entry if not already set
            if (!rootDirSet) {
                rootDir = name.endsWith('/') ? name.slice(0, -1) : name;
                rootDirSet = true;

                // If first entry is not at level 0, treat it as root
                if (level === 0 && !isFile) {
                    const dirName = name.endsWith('/') ? name.slice(0, -1) : name;

                    // Only consider it a wrapper if it's the ONLY top-level item
                    // We'll verify this at the end of the loop or track top-level items
                    // For now, let's just track it.
                    this.directories.add(dirName);
                    directoryStack.push(dirName);

                    // We optimistically set it to true, but we need to invalidate it if we see another level 0 item later
                    hasRootWrapper = true;

                    // ADDED: Ensure the root wrapper is part of the structure for preview
                    this.structure.push({
                        name: name,
                        level: level,
                        isFile: false,
                        fullPath: dirName,
                        content: content
                    });

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
                    fullPath: filePath,
                    content: content
                });

                // Add to files set as an object if it has content
                if (content) {
                    this.files.add({ path: filePath, content: content });
                } else {
                    this.files.add(filePath);
                }
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

                // If we encounter another level 0 item (file or dir) after the first one, it's not a single root wrapper
                if (level === 0 && i > 0) {
                    hasRootWrapper = false;
                }
            }
        }

        return {
            structure: this.structure,
            directories: Array.from(this.directories),
            files: Array.from(this.files),
            rootDir: rootDir,
            hasRootWrapper: hasRootWrapper
        };
    }

    parseLine(line) {
        if (!line.trim()) return null;

        // Calculate indentation level by analyzing tree structure
        let level = 0;
        let cleanLine = line;

        // Method 1: Count tree character depth
        const treeMatches = line.match(/^([\s│]*)(├|└|╣|║|╚|╬)/);
        if (treeMatches) {
            const prefix = treeMatches[1] || '';
            // Each 3-4 characters in prefix is roughly one level
            const pipeCount = (prefix.match(/│/g) || []).length;
            const spaces = prefix.replace(/│/g, '').length;
            level = pipeCount + Math.floor(spaces / 2) + 1; // +1 because the tree char itself is the next level
        } else {
            // Method 2: Count leading spaces (fallback)
            const leadingSpaces = line.match(/^ */)[0].length;
            // More flexible indentation detection: assume first indentation sets the unit
            if (leadingSpaces > 0) {
                if (!this.indentationUnit) {
                    this.indentationUnit = leadingSpaces;
                }
                level = Math.round(leadingSpaces / this.indentationUnit);
            } else {
                level = 0;
            }
        }

        // Remove all tree drawing characters and clean the line
        let rawName = line
            .replace(/^[\s├└│╣║╚╬─┌┐┘└┴┬┤├]*/, '')
            .replace(/^[\s─]*(.*?)[\s]*$/, '$1')
            .split('#')[0] // Strip bash-style comments
            .split('//')[0] // Strip JS-style comments
            .trim();

        if (!rawName) return null;

        // Scaffolding: Check for content in brackets [content]
        let scaffoldingContent = '';
        const contentMatch = rawName.match(/\[(.*?)\]$/);
        if (contentMatch) {
            scaffoldingContent = contentMatch[1];
            rawName = rawName.replace(/\[.*?\]$/, '').trim();
        }

        // Determine if it's a file or directory
        const isFile = this.isFileEntry(rawName);

        return {
            name: rawName,
            level: level,
            isFile: isFile,
            content: scaffoldingContent
        };
    }

    isFileEntry(name) {
        // Files end with extensions, directories typically end with / or have no extension
        if (name.endsWith('/')) return false;

        // Check for common files without extensions
        const commonExtensionlessFiles = ['dockerfile', 'makefile', 'readme', 'license', '.env', '.gitignore', '.dockerignore'];
        if (commonExtensionlessFiles.includes(name.toLowerCase())) return true;

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
