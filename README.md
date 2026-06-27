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
const page = await smsgo.list({ page: 1 })
const one = await smsgo.get('a1b2c3-...') // status de um envio específico
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

| `code`                 | HTTP | Significado                          |
| ---------------------- | ---- | ------------------------------------ |
| `validation_error`     | 422  | Dados do request inválidos           |
| `unauthorized`         | 401  | Chave/token inválido                 |
| `insufficient_balance` | 402  | Saldo insuficiente                   |
| `provider_out_of_stock`| 409  | Estoque do provedor indisponível     |
| `rate_limited`         | 429  | Limite de envios atingido            |

## Referência da API

### `new SMSGo(options)`

| Opção     | Tipo            | Default                      | Descrição                          |
| --------- | --------------- | ---------------------------- | ---------------------------------- |
| `apiKey`  | `string`        | —                            | **Obrigatório.** Sua SMSGo-key.    |
| `baseUrl` | `string`        | `https://api.smsgo.com.br`   | Útil para ambiente local/staging.  |
| `fetch`   | `typeof fetch`  | `globalThis.fetch`           | Injete um fetch (ex.: undici).     |

### Métodos

- `send(params)` → `Promise<SendResult>` — envia um SMS.
- `sendBulk(params)` → `Promise<SendResult>` — envia várias mensagens numa transação.
- `list({ page })` → `Promise<unknown>` — lista paginada de envios.
- `get(id)` → `Promise<unknown>` — detalha um envio pelo UUID.

Campos de `send`: `phone`, `message`, `schedule?` (ISO-8601), `reference?`, `from?`, `smsTypeId?`.

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
- [`receive-dlr-webhook.mjs`](./examples/receive-dlr-webhook.mjs) — recebe callbacks de entrega (DLR)

## Migrando da TotalVoice / Twilio?

SMSGo foca em **DX simples e preço em real**. Sem cadastro de remetente pra começar, sem cobrança em dólar, créditos que não expiram. Documentação completa da API: **[smspulse.apidog.io](https://smspulse.apidog.io/)**.

## Licença

MIT © SMSGo
