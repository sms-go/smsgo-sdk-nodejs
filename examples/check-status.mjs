// Envio em massa + consulta de status pelo id retornado.
//   SMSGO_KEY=suachave node examples/check-status.mjs
import { SMSGo } from '@orynlabs/smsgo'

const smsgo = new SMSGo({ apiKey: process.env.SMSGO_KEY })

const sent = await smsgo.sendBulk({
  messages: [
    { phone: '+5511999990000', message: 'Oi, Ana!' },
    { phone: '+5521988887777', message: 'Oi, Bruno!' },
  ],
})
console.log('Lote enviado:', sent) // { id, quantity, status }

// Detalhe de um envio pelo UUID
const detail = await smsgo.get(sent.id)
console.log('Status:', detail)

// Lista paginada dos últimos envios da conta
const page = await smsgo.list({ page: 1 })
console.log('Página 1:', page)
