# smsgo

[![npm](https://img.shields.io/npm/v/@orynlabs/smsgo.svg)](https://www.npmjs.com/package/@orynlabs/smsgo)
[![downloads](https://img.shields.io/npm/dm/@orynlabs/smsgo.svg)](https://www.npmjs.com/package/@orynlabs/smsgo)
[![CI](https://github.com/SMSFy/smsgo-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/SMSFy/smsgo-sdk/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@orynlabs/smsgo.svg)](./LICENSE)

SDK oficial **Node.js / TypeScript** para a [SMSGo](https://smsgo.com.br) — a API de SMS simples para o Brasil. Envie **OTP/2FA, alertas transacionais e campanhas** com algumas linhas de código.

- ⚡ **Integra em minutos** — autenticação cuidada pra você (sem ritual de token manual).
- 💸 **Sem mensalidade** — créditos pré-pagos que não expiram, preço em real.
- 🇧🇷 **Brasil-first** — entrega para todas as operadoras, LGPD nativo.
- 🟢 **Zero dependências** — usa o `fetch` nativo (Node 18+). Tipado de ponta a ponta.
- 🎁 **R$ 10 grátis** ao criar a conta — dá pra testar sem cartão.

> Nova conta e chave em **[smsgo.com.br](https://smsgo.com.br)** → painel → **Minha conta → API**.

## Instalação

```bash
npm install @orynlabs/smsgo
# ou: pnpm add @orynlabs/smsgo / yarn add @orynlabs/smsgo
```

## Começo rápido

```ts
import { SMSGo } from '@orynlabs/smsgo'

const smsgo = new SMSGo({ apiKey: process.env.SMSGO_KEY! })

const result = await smsgo.send({
  phone: '+5511999990000',
  message: 'Olá do SMSGo 👋',
})

console.log(result.id, result.status) // -> "a1b2c3...", "queued"
```

Você passa só a `apiKey`. O SDK troca a chave por um token Bearer (válido 48h), guarda em cache e renova sozinho quando expira.

## Enviar um OTP (2FA)

```ts
const code = String(Math.floor(100000 + Math.random() * 900000)) // 6 dígitos

await smsgo.send({
  phone: user.phone,
  message: `Seu código SMSGo é ${code}. Válido por 5 minutos.`,
})
// guarde `code` (com TTL) e compare na verificação
```

## Envio em massa

```ts
await smsgo.sendBulk({
  messages: [
    { phone: '+5511999990000', message: 'Oi, Ana!' },
    { phone: '+5521988887777', message: 'Oi, Bruno!' },
  ],
  urlCallback: 'https://seuapp.com/webhooks/smsgo', // status de entrega (opcional)
})
```

## Consultar envios

```ts
const page = await smsgo.list({ page: 1 }) // { meta, data: SendListItem[] }
const one = await smsgo.get('a1b2c3-...') // detalhe + summary { total, delivered, failed, inProgress, done }

// Acompanhar um envio grande sem baixar tudo — números por bucket, paginado:
const failed = await smsgo.getNumbers('a1b2c3-...', { status: 'failed', page: 1 })
```

## Modo de teste (sandbox)

Use a **chave de teste** (prefixo `test_`, no painel → Minha conta → API) como `apiKey`. Nada muda no código: os envios **não debitam saldo nem são despachados de verdade**, as respostas são idênticas às de produção (com `test: true`) e os webhooks disparam com o mesmo flag.

```ts
const sandbox = new SMSGo({ apiKey: process.env.SMSGO_TEST_KEY! })
const r = await sandbox.send({ phone: '+5511999990000', message: 'Teste' })
r.test // true

await sandbox.resolveMode() // "test"  (ou smsgo.mode após a 1ª chamada)
```

## Saldo e catálogo

```ts
const { balance, currency } = await smsgo.getBalance() // { balance: 9.3, currency: 'BRL', company }
const types = await smsgo.getSmsTypes() // [{ id, name, price, sale }] — id vai em smsTypeId
```

## Comprar créditos (off-session)

Cobra um **cartão salvo** sem abrir o painel (o cartão é cadastrado no painel via Stripe; a API só cobra um já salvo).

```ts
const plans = await smsgo.billing.plans() // pacotes por faixa
const cards = await smsgo.billing.cards() // 4 últimos dígitos

const receipt = await smsgo.billing.purchase({ quantity: 5000 /*, planId, cardId, coupon */ })
receipt.status // 'succeeded' já creditou o saldo | 'processing' confirma via webhook

const invoices = await smsgo.billing.invoices({ page: 1 })
```

> **Idempotência:** cada `purchase` gera uma cobrança nova. Em timeout, consulte `billing.invoices()` antes de repetir — **não faça retry cego**.

## Recarga automática + alerta de saldo

```ts
await smsgo.setAutoRecharge({
  enabled: true,
  threshold: 5, // recarrega quando o saldo ≤ R$ 5
  planQuantity: 5000, // créditos por recarga
  cardId: '<uuid>', // obrigatório p/ ligar
  alertEnabled: true,
  alertThreshold: 15, // e-mail quando o saldo ≤ R$ 15
})
const cfg = await smsgo.getAutoRecharge()
```

## Webhooks de saída (DLR + respostas)

```ts
// Define a URL que recebe `sms.status` (DLR) e `sms.reply` (resposta). Guarde o secret.
const { url, secret } = await smsgo.setWebhook({ url: 'https://seuapp.com/webhooks/smsgo' })
await smsgo.setWebhook({ rotateSecret: true }) // gira o segredo
await smsgo.setWebhook({ url: '' }) // desativa
```

Cada requisição traz `X-SMSGo-Signature: sha256=<hmac>` — o HMAC-SHA256 do **corpo bruto** com o seu `secret`. Valide sempre (veja [`examples/receive-dlr-webhook.mjs`](./examples/receive-dlr-webhook.mjs)).

## Contatos e listas

```ts
const listId = (await smsgo.lists.create({ name: 'Clientes VIP' })).id
const contactId = await smsgo.contacts.create({
  fullName: 'Ana Souza',
  phone: '+5511999990000',
  email: 'ana@exemplo.com',
  lists: [listId],
})

await smsgo.contacts.list({ page: 1, search: 'ana' }) // { meta, data }
await smsgo.contacts.update(contactId, { fullName: 'Ana S.', phone: '+5511999990000' })
await smsgo.contacts.delete(contactId)
```

## Tratamento de erros

Toda resposta não-2xx vira um `SMSGoError` com `status` e um `code` estável:

```ts
import { SMSGo, SMSGoError } from '@orynlabs/smsgo'

try {
  await smsgo.send({ phone: '+5511999990000', message: 'Olá' })
} catch (err) {
  if (err instanceof SMSGoError) {
    switch (err.code) {
      case 'insufficient_balance': // 402 — sem saldo
      case 'rate_limited':         // 429 — muitas requisições (veja err.details)
      case 'validation_error':     // 422 — dados inválidos
      default:
        console.error(err.status, err.code, err.message)
    }
  }
}
```

Em falhas de validação (422), `err.errors` traz o detalhe por campo (`{ field, message }[]`).

| `code`                     | HTTP | Significado                          |
| -------------------------- | ---- | ------------------------------------ |
| `validation_error`         | 422  | Dados do request inválidos           |
| `unauthorized`             | 401  | Chave/token inválido                 |
| `insufficient_balance`     | 402  | Saldo insuficiente                   |
| `provider_out_of_stock`    | 409  | Estoque do provedor indisponível     |
| `rate_limited`             | 429  | Limite de requisições atingido       |
| `card_declined`            | 402  | Cartão recusado na compra            |
| `authentication_required`  | 402  | Cartão exige autenticação (SCA)      |
| `card_required`            | 400  | Nenhum cartão apto à cobrança        |
| `payment_unavailable`      | 503  | Gateway de pagamento indisponível    |

## Referência da API

### `new SMSGo(options)`

| Opção     | Tipo            | Default                      | Descrição                          |
| --------- | --------------- | ---------------------------- | ---------------------------------- |
| `apiKey`  | `string`        | —                            | **Obrigatório.** Sua SMSGo-key.    |
| `baseUrl` | `string`        | `https://api.smsgo.com.br`   | Útil para ambiente local/staging.  |
| `fetch`   | `typeof fetch`  | `globalThis.fetch`           | Injete um fetch (ex.: undici).     |

### Métodos

**SMS**

- `send(params)` → `SendResult` — envia um SMS. Campos: `phone`, `message`, `schedule?` (ISO-8601), `reference?`, `from?`, `smsTypeId?`.
- `sendBulk(params)` → `SendResult` — envia várias mensagens numa transação (até 5000).
- `list({ page })` → `Paginated<SendListItem>` — lista paginada de envios.
- `get(id)` → `SendDetail` — detalha um envio (com `summary`).
- `getNumbers(id, { status?, page? })` → `Paginated<SendNumberItem>` — números do envio por bucket.
- `getSmsTypes()` → `SmsTypeItem[]` — catálogo de tipos de SMS.

**Conta**

- `getBalance()` → `Balance` — saldo em R$ + dados da conta.
- `getAutoRecharge()` / `setAutoRecharge(params)` → `AutoRechargeConfig` — recarga automática + alerta.
- `getWebhook()` / `setWebhook(params)` → `WebhookConfig` — webhook de saída.
- `mode` / `resolveMode()` → `'live' | 'test'` — modo da chave atual.

**Faturamento** (`smsgo.billing`)

- `plans()` → `Plan[]` · `cards()` → `Card[]` · `invoices({ page?, perPage? })` → `Paginated<InvoiceItem>`.
- `purchase(params)` → `PurchaseResult` — compra com cartão salvo (off-session).

**Contatos** (`smsgo.contacts`) e **Listas** (`smsgo.lists`)

- `list(params)` · `create(input)` · `get(id)` · `update(id, input)` · `delete(id)`.

> Referência de máquina completa: [`openapi.yaml`](https://smspulse.apidog.io/) — importável no Apidog/Postman.

## Ambiente local

```ts
const smsgo = new SMSGo({
  apiKey: process.env.SMSGO_KEY!,
  baseUrl: 'http://localhost:3333',
})
```

## Exemplos

Na pasta [`examples/`](./examples) (Node 18+). Para rodar a partir do repositório clonado, instale antes — o `npm install` já builda o `dist` (via `prepare`) e os exemplos resolvem o pacote por *self-reference*:

```bash
npm install
SMSGO_KEY=suachave node examples/send-otp.mjs +5511999990000
```

- [`send-sms.mjs`](./examples/send-sms.mjs) — envio simples
- [`send-otp.mjs`](./examples/send-otp.mjs) — código OTP/2FA
- [`check-status.mjs`](./examples/check-status.mjs) — envio em massa + consulta de status
- [`check-balance.mjs`](./examples/check-balance.mjs) — saldo + catálogo de tipos de SMS
- [`buy-credits.mjs`](./examples/buy-credits.mjs) — compra off-session + recarga automática
- [`configure-webhook.mjs`](./examples/configure-webhook.mjs) — configura o webhook de saída
- [`receive-dlr-webhook.mjs`](./examples/receive-dlr-webhook.mjs) — recebe callbacks de entrega (DLR)

## Migrando da TotalVoice / Twilio?

SMSGo foca em **DX simples e preço em real**. Sem cadastro de remetente pra começar, sem cobrança em dólar, créditos que não expiram. Documentação completa da API: **[smspulse.apidog.io](https://smspulse.apidog.io/)**.

## Licença

MIT © SMSGo
