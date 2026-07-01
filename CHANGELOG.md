# Changelog

Todas as mudanças relevantes deste pacote são documentadas aqui.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

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
