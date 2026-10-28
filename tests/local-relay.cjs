// Local MQTT relay over WebSocket for tests/sync-regression.cjs: npm i aedes ws, then node tests/local-relay.cjs
const { Aedes } = require('aedes');
const { WebSocketServer, createWebSocketStream } = require('ws');
const http = require('http');
(async () => {
  const aedes = await Aedes.createBroker();
  const srv = http.createServer();
  const wss = new WebSocketServer({ server: srv });
  wss.on('connection', (ws, req) => aedes.handle(createWebSocketStream(ws), req));
  srv.listen(8898, () => console.log('broker up'));
})();
