import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

// Load the common.js file
const commonJsPath = path.resolve('./src/common.js');
const commonJsCode = fs.readFileSync(commonJsPath, 'utf-8');

describe('isAuthenticated', () => {
    let dom;
    let isAuthenticated;

    beforeEach(() => {
        dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
            url: 'http://localhost'
        });
        global.document = dom.window.document;

        // Execute the code in the context
        const script = new dom.window.Function(commonJsCode + '\nreturn { isAuthenticated, fetchJSON };');
        const exports = script.call(dom.window);
        isAuthenticated = exports.isAuthenticated;
    });

    afterEach(() => {
        delete global.document;
    });

    it('should return true when netlify-cms-user cookie is present', () => {
        dom.window.document.cookie = 'netlify-cms-user=test-user';
        expect(isAuthenticated()).toBe(true);
    });

    it('should return false when netlify-cms-user cookie is not present', () => {
        dom.window.document.cookie = 'other-cookie=value';
        expect(isAuthenticated()).toBe(false);
    });

    it('should return false when no cookies are set', () => {
        expect(isAuthenticated()).toBe(false);
    });

    it('should return true when netlify-cms-user cookie is among multiple cookies', () => {
        dom.window.document.cookie = 'first=value1';
        dom.window.document.cookie = 'netlify-cms-user=test-user';
        dom.window.document.cookie = 'third=value3';
        expect(isAuthenticated()).toBe(true);
    });
});

describe('fetchJSON', () => {
    let dom;
    let fetchJSON;
    let isAuthenticated;
    let originalFetch;
    let originalSetTimeout;
    let originalClearTimeout;
    let consoleWarnSpy;

    beforeEach(() => {
        dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
            url: 'http://localhost'
        });
        global.document = dom.window.document;

        // Set up fetch and timer mocks
        originalFetch = global.fetch;
        originalSetTimeout = global.setTimeout;
        originalClearTimeout = global.clearTimeout;

        global.AbortController = dom.window.AbortController;

        // Execute the code in the context
        const script = new dom.window.Function(commonJsCode + '\nreturn { isAuthenticated, fetchJSON };');
        const exports = script.call(dom.window);
        fetchJSON = exports.fetchJSON.bind(dom.window);
        isAuthenticated = exports.isAuthenticated;

        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        global.fetch = originalFetch;
        global.setTimeout = originalSetTimeout;
        global.clearTimeout = originalClearTimeout;
        delete global.document;
        delete global.AbortController;
        consoleWarnSpy.mockRestore();
    });

    it('should return parsed JSON on successful fetch', async () => {
        const mockData = { name: 'test', value: 123 };
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue(mockData)
        });

        const result = await fetchJSON('http://example.com/data.json', { fallback: true });

        expect(result).toEqual(mockData);
        expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should return fallback on 404 error', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            json: vi.fn()
        });

        const fallback = { default: true };
        const result = await fetchJSON('http://example.com/missing.json', fallback);

        expect(result).toBe(fallback);
    });

    it('should log warning on 404 when authenticated', async () => {
        dom.window.document.cookie = 'netlify-cms-user=test-user';

        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            json: vi.fn()
        });

        const fallback = { default: true };
        await fetchJSON('http://example.com/missing.json', fallback);

        expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('[fetchJSON] HTTP error 404')
        );
    });

    it('should not log warning on 404 when not authenticated', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            json: vi.fn()
        });

        const fallback = { default: true };
        await fetchJSON('http://example.com/missing.json', fallback);

        expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should return fallback on timeout', async () => {
        let abortController;
        global.AbortController = class {
            constructor() {
                this.signal = { aborted: false };
                abortController = this;
            }
            abort() {
                this.signal.aborted = true;
            }
        };

        // Mock setTimeout to immediately call the abort
        global.setTimeout = vi.fn((callback) => {
            callback();
            return 123;
        });
        global.clearTimeout = vi.fn();

        global.fetch = vi.fn().mockImplementation(() => {
            const error = new Error('Aborted');
            error.name = 'AbortError';
            return Promise.reject(error);
        });

        const fallback = { timeout: true };
        const result = await fetchJSON('http://example.com/slow.json', fallback);

        expect(result).toBe(fallback);
    });

    it('should log timeout warning when authenticated', async () => {
        dom.window.document.cookie = 'netlify-cms-user=test-user';

        let abortCalled = false;
        global.AbortController = class {
            constructor() {
                this.signal = { aborted: false };
            }
            abort() {
                abortCalled = true;
                this.signal.aborted = true;
            }
        };

        global.setTimeout = vi.fn((callback) => {
            callback();
            return 123;
        });
        global.clearTimeout = vi.fn();

        global.fetch = vi.fn().mockImplementation(() => {
            if (abortCalled) {
                const error = new Error('Aborted');
                error.name = 'AbortError';
                return Promise.reject(error);
            }
            return new Promise(() => {});
        });

        await fetchJSON('http://example.com/slow.json', { timeout: true });

        expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('[fetchJSON] timeout')
        );
    });

    it('should return fallback on JSON parse error', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token'))
        });

        const fallback = { parse_error: true };
        const result = await fetchJSON('http://example.com/bad.json', fallback);

        expect(result).toBe(fallback);
    });

    it('should log JSON parse failure when authenticated', async () => {
        dom.window.document.cookie = 'netlify-cms-user=test-user';

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token'))
        });

        await fetchJSON('http://example.com/bad.json', { parse_error: true });

        expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('[fetchJSON] JSON parse failure')
        );
    });

    it('should return fallback on network error', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        const fallback = { network_error: true };
        const result = await fetchJSON('http://example.com/data.json', fallback);

        expect(result).toBe(fallback);
    });

    it('should log network error when authenticated', async () => {
        dom.window.document.cookie = 'netlify-cms-user=test-user';

        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        await fetchJSON('http://example.com/data.json', { network_error: true });

        expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('[fetchJSON] network error')
        );
    });

    it('should handle null fallback', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404
        });

        const result = await fetchJSON('http://example.com/missing.json', null);

        expect(result).toBeNull();
    });

    it('should handle undefined fallback', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404
        });

        const result = await fetchJSON('http://example.com/missing.json', undefined);

        expect(result).toBeUndefined();
    });

    it('should clear timeout on successful fetch', async () => {
        let timeoutId = 0;
        global.setTimeout = vi.fn(() => ++timeoutId);
        global.clearTimeout = vi.fn();

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({ success: true })
        });

        await fetchJSON('http://example.com/data.json', {});

        expect(global.clearTimeout).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should clear timeout on error', async () => {
        let timeoutId = 0;
        global.setTimeout = vi.fn(() => ++timeoutId);
        global.clearTimeout = vi.fn();

        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        await fetchJSON('http://example.com/data.json', {});

        expect(global.clearTimeout).toHaveBeenCalledWith(expect.any(Number));
    });
});
