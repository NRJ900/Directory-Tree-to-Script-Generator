import './style.css';
import { DirectoryTreeParser } from './parser.js';
import { ScriptGenerator } from './generator.js';
import { templates } from './templates.js';

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

        this.collapsedPaths = new Set(); // Track collapsed directory paths
        this.initializeElements();
        this.bindEvents();
        this.loadState(); // Load saved state on startup
        this.updatePreview();
    }

    initializeElements() {
        this.treeInput = document.getElementById('treeInput');
        this.outputType = document.getElementById('outputType');
        this.rootName = document.getElementById('rootName');
        this.templateSelect = document.getElementById('templateSelect');
        this.generateBtn = document.getElementById('generateBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.loadExampleBtn = document.getElementById('loadExampleBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.downloadZipBtn = document.getElementById('downloadZipBtn');
        this.aiOptimizeBtn = document.getElementById('aiOptimizeBtn');
        this.outputCode = document.getElementById('outputCode');
        this.structurePreview = document.getElementById('structurePreview');
        this.statsDashboard = document.getElementById('statsDashboard');
        this.statusMessage = document.getElementById('statusMessage');
    }

    bindEvents() {
        this.generateBtn.addEventListener('click', () => this.generateScript());
        this.clearBtn.addEventListener('click', () => this.clearAll());
        this.loadExampleBtn.addEventListener('click', () => this.loadExample());
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.downloadBtn.addEventListener('click', () => this.downloadScript());
        if (this.downloadZipBtn) this.downloadZipBtn.addEventListener('click', () => this.downloadZip());
        if (this.aiOptimizeBtn) this.aiOptimizeBtn.addEventListener('click', () => this.copyAIPrompt());

        this.treeInput.addEventListener('input', () => {
            this.updatePreview();
            this.saveState();
        });
        this.outputType.addEventListener('change', () => {
            if (this.currentScript) {
                this.generateScript();
            }
            this.saveState();
        });
        this.rootName.addEventListener('input', () => {
            this.updatePreview();
            this.saveState();
        });
        if (this.templateSelect) {
            this.templateSelect.addEventListener('change', (e) => this.loadTemplate(e.target.value));
        }

        // Event delegation for preview clicks
        this.structurePreview.addEventListener('click', (e) => this.handlePreviewClick(e));
    }

    loadTemplate(key) {
        if (key && templates[key]) {
            this.treeInput.value = templates[key];
            this.updatePreview();
            this.saveState();
            this.showStatus(`Template "${key}" loaded!`, 'success');
        }
    }

    saveState() {
        const state = {
            treeInput: this.treeInput.value,
            outputType: this.outputType.value,
            rootName: this.rootName.value
        };
        localStorage.setItem('directory_tree_state', JSON.stringify(state));
    }

    loadState() {
        const saved = localStorage.getItem('directory_tree_state');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                this.treeInput.value = state.treeInput || '';
                this.outputType.value = state.outputType || 'python';
                this.rootName.value = state.rootName || '';
            } catch (e) {
                console.error('Failed to load state', e);
            }
        }
    }

    generateScript() {
        try {
            const input = this.treeInput.value.trim();
            if (!input) {
                throw new Error('Please enter a directory tree structure');
            }

            this.setLoading(true);

            const parsed = this.parser.parse(input);

            let rootDir = this.rootName.value.trim();
            if (!rootDir) {
                // If the tree already starts with a root folder, don't add a default prefix
                rootDir = parsed.hasRootWrapper ? '' : (parsed.rootDir || 'project');
            }
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
                case 'powershell':
                    script = ScriptGenerator.generatePowerShell(parsed.directories, parsed.files, rootDir);
                    language = 'powershell';
                    break;
                case 'nodejs':
                    script = ScriptGenerator.generateNodeJS(parsed.directories, parsed.files, rootDir);
                    language = 'javascript';
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

    updatePreview() {
        try {
            const input = this.treeInput.value.trim();
            if (!input) {
                this.structurePreview.textContent = 'Enter directory tree structure to see preview...';
                return;
            }

            const parsed = this.parser.parse(input);
            let html = '';

            if (parsed.structure.length > 0) {

                // Determine visibility based on collapsed paths
                const visibleNodes = [];
                let skipLevel = Infinity;

                // Prepare nodes structure (insert virtual root if needed)
                let nodesToRender = parsed.structure;

                if (!parsed.hasRootWrapper) {
                    const rootDirName = this.rootName.value.trim() || parsed.rootDir || 'project';
                    const virtualRoot = {
                        name: rootDirName + '/',
                        level: 0,
                        isFile: false,
                        fullPath: '$$VIRTUAL_ROOT$$', // Special path for virtual root
                        content: ''
                    };

                    // Shift all children details
                    const shiftedChildren = parsed.structure.map(node => ({
                        ...node,
                        level: node.level + 1
                    }));

                    nodesToRender = [virtualRoot, ...shiftedChildren];
                }

                nodesToRender.forEach((node, index) => {
                    // Check if we should skip this node (it's inside a collapsed folder)
                    if (node.level > skipLevel) {
                        return; // Skip hidden nodes
                    } else {
                        skipLevel = Infinity; // Reset skip if we're back to a visible level
                    }

                    // If this node is collapsed, set skipLevel for subsequent children
                    if (!node.isFile && this.collapsedPaths.has(node.fullPath)) {
                        skipLevel = node.level;
                    }

                    const indent = '&nbsp;'.repeat(node.level * 2);
                    const isCollapsed = this.collapsedPaths.has(node.fullPath);
                    const arrowClass = isCollapsed ? 'preview-arrow collapsed' : 'preview-arrow';
                    const icon = node.isFile ? '📄' : '📁';

                    // Polish: Highlight root icon
                    const iconClass = (index === 0 && !node.isFile) ? 'preview-icon preview-root-icon' : 'preview-icon';

                    // Add arrow only for folders
                    const arrow = node.isFile ? '<span style="display:inline-block; width:14px"></span>' : `<span class="${arrowClass}">▼</span>`;

                    const typeClass = node.isFile ? 'preview-file' : 'preview-folder';

                    const escapeHtml = (str) => str
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/"/g, "&quot;")
                        .replace(/'/g, "&#039;");

                    const escapedName = escapeHtml(node.name);
                    const scaffold = node.content ? `<span class="preview-scaffold">[${escapeHtml(node.content)}]</span>` : '';

                    // Add data-path for click handling
                    html += `<div class="preview-line" data-path="${node.fullPath}" data-is-file="${node.isFile}">
                        <span class="preview-indent">${indent}</span>
                        ${arrow}
                        <span class="${iconClass}">${icon}</span>
                        <span class="preview-name ${typeClass}">${escapedName}</span>
                        ${scaffold}
                    </div>`;
                });
            } else {
                html = `
                    <div class="empty-state-container">
                        <div class="empty-state-icon">🌳</div>
                        <p>Waiting for your tree...</p>
                        <small>Paste a structure or load an example to begin</small>
                    </div>
                `;
                if (this.statsDashboard) this.statsDashboard.innerHTML = '';
            }

            this.structurePreview.innerHTML = html;

            // Render Stats
            if (this.statsDashboard && parsed.structure.length > 0) {
                this.updateStats(parsed.structure);
            }

        } catch (error) {
            console.error(error);
            this.structurePreview.innerHTML = `<div class="preview-empty error">Preview Error: ${error.message}</div>`;
        }
    }

    updateStats(structure) {
        let fileCount = 0;
        let dirCount = 0;
        let maxDepth = 0;

        structure.forEach(node => {
            if (node.isFile) {
                fileCount++;
            } else {
                dirCount++;
            }
            if (node.level > maxDepth) maxDepth = node.level;
        });

        this.statsDashboard.innerHTML = `
            <div class="stat-item" title="Total Files">
                <span class="stat-icon">📄</span>
                <span class="stat-value">${fileCount}</span>
                <span class="stat-label">Files</span>
            </div>
            <div class="stat-item" title="Total Directories">
                <span class="stat-icon">📁</span>
                <span class="stat-value">${dirCount}</span>
                <span class="stat-label">Directories</span>
            </div>
            <div class="stat-item" title="Maximum Nesting Depth">
                <span class="stat-icon">↘️</span>
                <span class="stat-value">${maxDepth}</span>
                <span class="stat-label">Depth</span>
            </div>
        `;
    }



    handlePreviewClick(e) {
        const line = e.target.closest('.preview-line');
        if (!line) return;

        const isFile = line.dataset.isFile === 'true';
        if (isFile) return; // Files are not collapsible

        const path = line.dataset.path;
        if (!path) return;

        if (this.collapsedPaths.has(path)) {
            this.collapsedPaths.delete(path);
        } else {
            this.collapsedPaths.add(path);
        }

        this.updatePreview();
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
            case 'powershell':
                filename += '.ps1';
                mimeType = 'application/x-powershell';
                break;
            case 'nodejs':
                filename += '.js';
                mimeType = 'application/javascript';
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

    async downloadZip() {
        try {
            const input = this.treeInput.value.trim();
            if (!input) throw new Error('Input is empty');

            this.setLoading(true);
            const parsed = this.parser.parse(input);

            let rootDir = this.rootName.value.trim();
            if (!rootDir) {
                rootDir = parsed.hasRootWrapper ? '' : (parsed.rootDir || 'project');
            }

            const blob = await ScriptGenerator.generateZip(parsed.directories, parsed.files, rootDir);

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${rootDir}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showStatus('Folder structure ZIP downloaded!', 'success');
        } catch (error) {
            this.showStatus(`ZIP Error: ${error.message}`, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async copyAIPrompt() {
        try {
            const input = this.treeInput.value.trim();
            if (!input) throw new Error('Input is empty');

            const parsed = this.parser.parse(input);
            const prompt = ScriptGenerator.generateAIPrompt(parsed.structure, this.rootName.value || parsed.rootDir);

            await navigator.clipboard.writeText(prompt);
            this.showStatus('AI-optimized prompt copied!', 'success');
        } catch (error) {
            this.showStatus(`AI Prompt Error: ${error.message}`, 'error');
        }
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

document.addEventListener('DOMContentLoaded', () => {
    new DirectoryTreeApp();
});
