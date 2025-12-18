const handler = require('./server.js');
console.log('Export type:', typeof handler);
console.log('Export keys:', Object.keys(handler));
if (typeof handler === 'function') {
    console.log('Export is a function (good for Vercel if it is the app)');
} else {
    console.log('Export is NOT a function (might be the cause of FUNCTION_INVOCATION_FAILED)');
}
