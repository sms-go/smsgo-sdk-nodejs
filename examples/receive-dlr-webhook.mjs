// Recebe callbacks de status de entrega (DLR) num endpoint próprio.
// Passe a URL pública deste endpoint em `urlCallback` no sendBulk.
//   node examples/receive-dlr-webhook.mjs   (depois exponha via ngrok/Cloudflare Tunnel)
//
// Sem dependências: usa o http nativo do Node.
import http from 'node:http'

const PORT = process.env.PORT ?? 4000

http
  .createServer((req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(405).end()
      return
    }
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      let payload
      try {
        payload = JSON.parse(body)
      } catch {
        payload = body
      }
      // payload traz o status de entrega da mensagem (entregue / falhou / etc).
      console.log('DLR recebido:', payload)
      res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}')
    })
  })
  .listen(PORT, () => console.log(`Ouvindo DLR em http://localhost:${PORT}`))
