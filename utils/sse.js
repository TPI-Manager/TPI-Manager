const clients = new Set();

const sseHandler = (req, res) => {
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
  };
  res.writeHead(200, headers);

  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res
  };

  clients.add(newClient);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', id: clientId })}\n\n`);

  req.on('close', () => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`${clientId} Connection closed`);
    }
    clients.delete(newClient);
  });
};

const broadcast = (type, data) => {
  clients.forEach(client => {
    client.res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  });
};

module.exports = { sseHandler, broadcast };
