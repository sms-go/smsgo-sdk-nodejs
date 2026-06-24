# Contribuindo

Obrigado pelo interesse! Este SDK é fino de propósito — um wrapper tipado sobre a
API pública do SMSGo.

## Desenvolvimento

```bash
npm install
npm run build        # gera dist/ (ESM + CJS + tipos)
npm run dev          # build em watch
```

## Antes de abrir um PR

- Mantenha **zero dependências de runtime** (use o `fetch` nativo).
- Rode o build e confirme que os smoke tests passam:
  ```bash
  node -e "const {SMSGo}=require('./dist/index.cjs'); new SMSGo({apiKey:'x'})"
  ```
- Atualize o `CHANGELOG.md` e os exemplos quando mudar a API pública.

## Reportando bugs

Abra uma issue com: versão do pacote, versão do Node, trecho mínimo que reproduz
e o `code`/`status` do `SMSGoError` quando houver.
