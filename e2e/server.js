import { createServer } from 'vite';

export default async function setup() {
  // Servidor no próprio processo: fecha sem depender de taskkill no Windows.
  const server = await createServer({ mode: 'e2e', server: { host: '127.0.0.1', port: 5178, strictPort: true } });
  await server.listen();
  return async () => { await server.close(); };
}
