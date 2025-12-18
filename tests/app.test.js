const request = require('supertest');
const app = require('../server');

describe('App Endpoints', () => {
    let server;

    beforeAll((done) => {
        // Suppress superagent double callback warning
        const originalWarn = console.warn;
        console.warn = (...args) => {
            if (args[0] && args[0].includes && args[0].includes('superagent: double callback bug')) return;
            originalWarn.apply(console, args);
        };
        // Wait for server to be ready if needed
        done();
    });

    afterAll((done) => {
        // Close any open handles
        if (app.close) app.close();
        done();
    });

    it('GET /api/health should return ok', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toEqual('ok');
    });

    it('GET /api/stream should set SSE headers', async () => {
        // SSE keeps connection open, so supertest might hang if we don't handle it.
        // However, for just checking headers, we can use .expect
        // But since it is a stream, we might need timeout or abort.
        // Actually, supertest will wait for 'end', which never happens for SSE.
        // We can use a trick:
        const res = await request(app).get('/api/stream').timeout(1000).catch(e => e.response);

        // If it times out or returns, we check headers.
        // Note: detailed robust SSE testing in Jest is complex without a custom client.
        // But we can check if it STARTS correctly.
        if (res) {
            expect(res.statusCode).toEqual(200);
            expect(res.headers['content-type']).toEqual('text/event-stream');
            expect(res.headers['connection']).toEqual('keep-alive');
        }
    });
});
