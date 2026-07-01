// Configura (e rotaciona) o webhook de saída que recebe DLR + respostas.
//   SMSGO_KEY=suachave node examples/configure-webhook.mjs https://seuapp.com/webhooks/smsgo
import { SMSGo } from '@orynlabs/smsgo'

const smsgo = new SMSGo({ apiKey: process.env.SMSGO_KEY })

const url = process.argv[2] ?? 'https://seuapp.com/webhooks/smsgo'

// Em produção a URL deve ser HTTPS e pública. Guarde o `secret` retornado —
// é ele que valida o header `X-SMSGo-Signature` (HMAC-SHA256 do corpo bruto).
const cfg = await smsgo.setWebhook({ url })
console.log('Webhook configurado:', cfg) // { url, secret }

// Girar o segredo depois (invalida o anterior):
// await smsgo.setWebhook({ rotateSecret: true })

// Desativar:
// await smsgo.setWebhook({ url: '' })

// Ver a config atual:
console.log('Atual:', await smsgo.getWebhook())
