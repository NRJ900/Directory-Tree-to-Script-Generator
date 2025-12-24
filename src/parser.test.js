import { describe, it, expect, beforeEach } from 'vitest';
import { DirectoryTreeParser } from '../src/parser.js';

describe('DirectoryTreeParser', () => {
    let parser;

    beforeEach(() => {
        parser = new DirectoryTreeParser();
    });

    it('should parse a simple structure', () => {
        const input = `
project/
    file1.txt
    subdir/
        file2.py
        `.trim();

        const result = parser.parse(input);

        expect(result.rootDir).toBe('project');
        expect(result.directories).toContain('project/subdir');
        expect(result.files).toContain('project/file1.txt');
        expect(result.files).toContain('project/subdir/file2.py');
    });

    it('should handle tree characters', () => {
        const input = `
my-app/
├── src/
│   └── main.js
└── package.json
        `.trim();

        const result = parser.parse(input);

        expect(result.rootDir).toBe('my-app');
        expect(result.directories).toContain('my-app/src');
        expect(result.files).toContain('my-app/src/main.js');
        expect(result.files).toContain('my-app/package.json');
    });

    it('should throw error on empty input', () => {
        expect(() => parser.parse('')).toThrow('Input cannot be empty');
    });

    it('should identify files vs directories correctly', () => {
        expect(parser.isFileEntry('test.py')).toBe(true);
        expect(parser.isFileEntry('Dockerfile')).toBe(true);
        expect(parser.isFileEntry('folder/')).toBe(false);
        expect(parser.isFileEntry('no-extension')).toBe(false);
    });

    it('should strip comments from input lines', () => {
        const input = `
my-project/
    # This is a comment
    src/ # source folder
        main.js // entry point
        `.trim();

        const result = parser.parse(input);

        expect(result.directories).toContain('my-project/src');
        expect(result.files).toContain('my-project/src/main.js');
        // Check that names don't contain comments
        const srcNode = result.structure.find(n => n.name === 'src');
        const mainNode = result.structure.find(n => n.name === 'main.js');
        expect(srcNode).toBeDefined();
        expect(mainNode).toBeDefined();
    });
});
