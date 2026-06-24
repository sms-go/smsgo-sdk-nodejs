# Changelog

Todas as mudanças relevantes deste pacote são documentadas aqui.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [0.1.0] - Não lançado

### Adicionado

- Cliente `SMSGo` com autenticação de 2 passos transparente (SMSGo-key → token
  Bearer de 48h, com cache e refresh automático no 401).
- Métodos `send`, `sendBulk`, `list` e `get`.
- `SMSGoError` tipado por `code` estável (`validation_error`, `insufficient_balance`,
  `rate_limited`, etc.).
- Build dual ESM + CJS com tipos (`.d.ts`). Zero dependências de runtime (fetch nativo).
