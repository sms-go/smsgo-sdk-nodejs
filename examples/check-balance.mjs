// Consulta saldo, catálogo de tipos de SMS e envia usando um sms_type_id.
//   SMSGO_KEY=suachave node examples/check-balance.mjs
import { SMSGo } from '@orynlabs/smsgo'

const smsgo = new SMSGo({ apiKey: process.env.SMSGO_KEY })

const { balance, currency } = await smsgo.getBalance()
console.log(`Saldo: ${balance} ${currency}`)

const types = await smsgo.getSmsTypes()
console.log('Tipos de SMS:', types) // [{ id, name, price, sale }]

// O `id` numérico do catálogo é o valor de `smsTypeId` no envio.
if (types[0]) {
  const r = await smsgo.send({
    phone: '+5511999990000',
    message: 'Olá do SMSGo',
    smsTypeId: types[0].id,
  })
  console.log('Enviado:', r)
}
