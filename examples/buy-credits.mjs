// Compra de créditos com cartão salvo (off-session) + recarga automática.
//   SMSGO_KEY=suachave node examples/buy-credits.mjs
import { SMSGo, SMSGoError } from '@orynlabs/smsgo'

const smsgo = new SMSGo({ apiKey: process.env.SMSGO_KEY })

// Pacotes e cartões disponíveis (o cartão é cadastrado no painel via Stripe).
console.log('Pacotes:', await smsgo.billing.plans())
console.log('Cartões:', await smsgo.billing.cards()) // só os 4 últimos dígitos

try {
  // Cada chamada gera uma cobrança nova — NÃO faça retry cego (veja billing.invoices()).
  const receipt = await smsgo.billing.purchase({ quantity: 5000 })
  console.log('Compra:', receipt) // { status, invoiceUuid, total, quantity, paymentIntentId }
} catch (err) {
  if (err instanceof SMSGoError) {
    // card_declined | authentication_required (SCA) | card_required
    console.error(`Compra falhou (${err.code}):`, err.message)
  } else throw err
}

// Deixa a conta se recarregar sozinha quando o saldo ficar baixo:
const cards = await smsgo.billing.cards()
if (cards[0]) {
  await smsgo.setAutoRecharge({
    enabled: true,
    threshold: 5, // recarrega quando o saldo ≤ R$ 5
    planQuantity: 5000, // créditos por recarga
    cardId: cards[0].id,
    alertEnabled: true,
    alertThreshold: 15, // e-mail de aviso quando o saldo ≤ R$ 15
  })
  console.log('Recarga automática:', await smsgo.getAutoRecharge())
}
