# Publicando o `@orynlabs/smsgo` (npm)

Guia de release do SDK Node.js. Registry: **npm** · pacote `@orynlabs/smsgo` (escopo público `@orynlabs`).

## Pré-requisitos (uma vez)

A publicação usa **Trusted Publishing** (OIDC): o npm confia no workflow
[`/.github/workflows/publish.yml`](.github/workflows/publish.yml) deste repo e emite uma
credencial de uso único a cada execução. **Não há token**, então o 2FA da conta não bloqueia o CI.
O antigo `NPM_TOKEN` falhava com `EOTP` e derrubou o release da 0.4.0 em jul/2026.

Configurar uma vez, logado no npm com 2FA, por **um** dos caminhos:

- **Site:** npmjs.com → `@orynlabs/smsgo` → _Settings → Trusted Publisher → GitHub Actions_,
  com organização `sms-go`, repositório `smsgo-sdk-nodejs` e workflow `publish.yml` (ambiente vazio).
- **CLI** (npm ≥ 11.5): `npm trust github @orynlabs/smsgo --file publish.yml --repo sms-go/smsgo-sdk-nodejs --allow-publish`.
  Um token que ignora 2FA recebe `403`; use a sessão de `npm login`.

Depois do primeiro publish verde, apague o secret `NPM_TOKEN` do repo e, no npm, marque
_Require two-factor authentication and disallow tokens_ no pacote.

## Passo a passo do release

1. `master` verde no CI. Trabalhe numa branch e abra PR se preciso.
2. **Suba a versão** em [`package.json`](package.json) (SemVer; ex.: `0.3.0` → `0.3.1`). O npm **recusa** republicar uma versão já existente.
3. Atualize o [`CHANGELOG.md`](CHANGELOG.md) com a nova seção.
4. (Opcional, sanity local) `npm install && npm run build`.
5. Commit + push na `master`.
6. **Tag + Release:**
   ```bash
   git tag v0.3.0 && git push origin v0.3.0
   ```
   No GitHub → _Releases → Draft a new release_ → escolha a tag `v0.3.0` → _Publish release_.
   Isso dispara o `publish.yml` (evento `release: published`).
   - Alternativa: _Actions → Publish to npm → Run workflow_ (`workflow_dispatch`).
   - Fallback local: `npm login && npm publish --access public --otp=<código 2FA>` (sem provenance: ela só existe no CI).

## Verificação pós-publicação

```bash
npm view @orynlabs/smsgo version      # deve mostrar a nova versão
npm view @orynlabs/smsgo dist-tags
# smoke em pasta temporária:
mkdir /tmp/t && cd /tmp/t && npm init -y && npm i @orynlabs/smsgo && node -e "console.log(require('@orynlabs/smsgo').verifyWebhookSignature)"
```
A página https://www.npmjs.com/package/@orynlabs/smsgo mostra a versão + o selo de **provenance**.

## Notas

- A tag da versão é **imutável** na prática — para corrigir, suba um patch (`0.3.1`).
- `npm unpublish` só é permitido em janelas curtas e com restrições; prefira `npm deprecate`.
- Mantenha a versão do `package.json` alinhada às dos outros SDKs (release unificado). Ver o guia central [`api/docs/sdks-publicacao.md`](../api/docs/sdks-publicacao.md).
