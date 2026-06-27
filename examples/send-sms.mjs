// Envio simples de 1 SMS.
//   SMSGO_KEY=suachave node examples/send-sms.mjs +5511999990000
import { SMSGo } from '@smsgo/sdk'

const smsgo = new SMSGo({ apiKey: process.env.SMSGO_KEY })

const phone = process.argv[2] ?? '+5511999990000'
const result = await smsgo.send({ phone, message: 'Olá do SMSGo 👋' })

console.log('Enviado:', result) // { id, quantity, status }
