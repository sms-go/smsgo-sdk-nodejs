// Envio de um código OTP (2FA) por SMS.
//   SMSGO_KEY=suachave node examples/send-otp.mjs +5511999990000
import { SMSGo, SMSGoError } from '@orynlabs/smsgo'

const smsgo = new SMSGo({ apiKey: process.env.SMSGO_KEY })

const phone = process.argv[2] ?? '+5511999990000'
const code = String(Math.floor(100000 + Math.random() * 900000)) // 6 dígitos

try {
  await smsgo.send({
    phone,
    message: `Seu código SMSGo é ${code}. Válido por 5 minutos.`,
  })
  // Em produção: guarde `code` com TTL (ex.: Redis) e compare na verificação.
  console.log(`OTP ${code} enviado para ${phone}`)
} catch (err) {
  if (err instanceof SMSGoError) console.error(`Falhou (${err.code}):`, err.message)
  else throw err
}
