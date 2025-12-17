const fs = require("fs");
const path = require("path");
const { getFilePath, readJSON, writeJSON, deleteFile, FOLDERS } = require("../utils/storage");

const TEST_DIR = path.join(__dirname, "../storage/test_temp");
const TEST_FILE = path.join(TEST_DIR, "test_data.json");

describe("Utils: Storage Module", () => {

    beforeAll(() => {
        if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });
    });

    afterAll(() => {
        if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
    });

    test("getFilePath should ensure .json extension", () => {
        expect(getFilePath(TEST_DIR, "file1")).toBe(path.join(TEST_DIR, "file1.json"));
        expect(getFilePath(TEST_DIR, "file2.json")).toBe(path.join(TEST_DIR, "file2.json"));
    });

    test("writeJSON should write object to file", () => {
        const data = { key: "value", num: 123 };
        const success = writeJSON(TEST_FILE, data);
        expect(success).toBe(true);
        expect(fs.existsSync(TEST_FILE)).toBe(true);
    });

    test("readJSON should parse file content correctly", () => {
        const data = readJSON(TEST_FILE);
        expect(data).toEqual({ key: "value", num: 123 });
    });

    test("readJSON should return null for non-existent file", () => {
        expect(readJSON(path.join(TEST_DIR, "ghost.json"))).toBeNull();
    });

    test("readJSON should safely handle directories", () => {
        expect(readJSON(TEST_DIR)).toBeNull();
    });

    test("deleteFile should remove file", () => {
        const success = deleteFile(TEST_FILE);
        expect(success).toBe(true);
        expect(fs.existsSync(TEST_FILE)).toBe(false);
    });

    test("deleteFile should return true even if file doesn't exist", () => {
        // Based on implementation, it catches errors or checks existsSync
        // If implementation checks existsSync first, it returns true (soft delete)
        const success = deleteFile(path.join(TEST_DIR, "ghost.json"));
        expect(success).toBe(true);
    });
});