# Changelog

Todas as mudanças relevantes deste pacote são documentadas aqui.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [0.5.0] - 2026-10-09

### Alterado

- **Publicação por Trusted Publishing (OIDC):** o `publish.yml` não usa mais o `NPM_TOKEN`, que
  exigia 2FA e falhava com `EOTP`. O pacote sai com provenance automática.
- README atualizado.

### Compatibilidade

- **Nenhuma mudança de código** em relação à 0.4.0: a API pública é idêntica. Os SDKs Python, Go
  e PHP seguem em 0.4.0; os recursos de envio internacional entram na próxima versão unificada.

## [0.4.0] - 2026-07-02

### Adicionado

- **Anti-replay opcional em `verifyWebhookSignature`:** o novo 4º argumento
  `{ toleranceSeconds }` exige, além da assinatura, que o `sentAt` do corpo esteja dentro da
  janela de frescor. Corpo sem `sentAt` válido, ou fora da janela, retorna `false`. Para
  idempotência, deduplique também pelo `id` do corpo.

### Compatibilidade

- 100% retrocompatível: sem `toleranceSeconds`, o comportamento é o da 0.3.0 (só assinatura).
- Esta versão foi marcada em 02/jul/2026, mas o publish no npm falhou com `EOTP` e ela só chegou
  ao registry depois, publicada à mão.

## [0.3.0] - 2026-07-01

### Adicionado

- **`verifyWebhookSignature(rawBody, signatureHeader, secret)`** — helper para validar a
  assinatura `X-SMSGo-Signature` dos webhooks de saída. Recalcula o HMAC-SHA256 do **corpo
  bruto** e compara em **tempo constante** (`crypto.timingSafeEqual`); retorna `false` (sem
  lançar) para assinatura ausente/malformada/incorreta. Antes o README pedia para o cliente
  implementar o HMAC na mão — agora é uma linha. Continua zero-dependência (usa `node:crypto`).
- `examples/receive-dlr-webhook.mjs` passou a **verificar a assinatura** antes de processar o
  callback (lê `SMSGO_WEBHOOK_SECRET`, acumula o corpo bruto e rejeita com `401` se inválida).

### Compatibilidade

- 100% retrocompatível — apenas adiciona uma exportação nova. Parte do release unificado
  **0.3.0** dos SDKs oficiais (Node, Python, Go, PHP) com a mesma superfície e o mesmo helper
  de verificação de webhook.

## [0.2.1] - 2026-07-01

### Corrigido

- **Docs:** removida a seção "Ambiente local" do README, que exibia
  `baseUrl: 'http://localhost:3333'` na página do pacote no npm. O default já é
  a API pública (`https://api.smsgo.com.br`); o `baseUrl` só deve ser alterado se
  orientado pela SMSGo. Sem mudança de código.

## [0.2.0] - 2026-06-30

### Adicionado

- **Paridade com a API pública `v1`.** Novos métodos no cliente:
  - SMS: `getNumbers(id, { status?, page? })` — números de um envio (paginado, filtrável por bucket).
  - Catálogo: `getSmsTypes()` — tipos de SMS ativos (`id` = `smsTypeId`).
  - Conta: `getBalance()`, `getAutoRecharge()`, `setAutoRecharge()`, `getWebhook()`, `setWebhook()`.
  - Namespaces `billing` (`plans()`, `cards()`, `invoices()`, `purchase()`),
    `contacts` (`list`/`create`/`get`/`update`/`delete`) e `lists` (idem).
- **Modo de teste (sandbox):** basta usar a chave `test_…`; o modo detectado fica
  exposto em `smsgo.mode` e `await smsgo.resolveMode()`.
- **Tipagem completa** dos payloads e respostas (antes `list`/`get` eram `unknown`):
  `SendResult` agora inclui `test?`; novos tipos `Paginated<T>`, `SendDetail`,
  `SendSummary`, `Balance`, `Plan`, `Card`, `InvoiceItem`, `AutoRechargeConfig`,
  `WebhookConfig`, `PurchaseResult`, `ContactDetail`, `ListResult`, etc.
- `SMSGoError.errors` — array de erros por campo (`{ field, message }`) em falhas de
  validação (422). Novos códigos mapeados: `card_declined`, `authentication_required`,
  `card_required`, `payment_unavailable`.

### Compatibilidade

- 100% retrocompatível. `send`, `sendBulk`, `list` e `get` mantêm assinatura;
  `list`/`get` agora retornam tipos concretos no lugar de `unknown`.

## [0.1.0] - 2026-06-27

### Adicionado

- Cliente `SMSGo` com autenticação de 2 passos transparente (SMSGo-key → token
  Bearer de 48h, com cache e refresh automático no 401).
- Métodos `send`, `sendBulk`, `list` e `get`.
- `SMSGoError` tipado por `code` estável (`validation_error`, `insufficient_balance`,
  `rate_limited`, etc.).
- Build dual ESM + CJS com tipos (`.d.ts`). Zero dependências de runtime (fetch nativo).
