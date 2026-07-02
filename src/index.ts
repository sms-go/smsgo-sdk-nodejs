/**
 * SDK oficial da SMSGo para Node.js / TypeScript.
 *
 * Cuida da autenticação de 2 passos (SMSGo-key → token Bearer de 48h) de forma
 * transparente: você só passa a `apiKey`. O token é buscado sob demanda, cacheado
 * e renovado automaticamente quando expira ou retorna 401.
 *
 * Cobre toda a API pública `v1`: envio de SMS, consulta de envios, catálogo de
 * tipos, saldo, faturamento (compra off-session), recarga automática, webhooks
 * de saída, contatos e listas.
 *
 * @example
 * import { SMSGo } from '@orynlabs/smsgo'
 * const smsgo = new SMSGo({ apiKey: process.env.SMSGO_KEY! })
 * await smsgo.send({ phone: '+5511999990000', message: 'Olá do SMSGo' })
 *
 * @example
 * // Modo de teste (sandbox): basta usar a chave `test_…` — nada muda no código.
 * const sandbox = new SMSGo({ apiKey: process.env.SMSGO_TEST_KEY! })
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

export interface SMSGoOptions {
  /** Chave permanente da conta (painel → Minha conta → API). Aceita `test_…` (sandbox). */
  apiKey: string
  /** Base da API. Default: https://api.smsgo.com.br */
  baseUrl?: string
  /** Implementação de fetch (default: fetch global do Node 18+). */
  fetch?: typeof fetch
}

/* -------------------------------------------------------------------------- */
/* Tipos de envio                                                             */
/* -------------------------------------------------------------------------- */

export interface SendParams {
  /** Número em formato internacional E.164, ex.: +5511999990000. */
  phone: string
  /** Texto da mensagem (1–1600 caracteres; limite real depende do provedor). */
  message: string
  /** Agendamento ISO-8601 (opcional). */
  schedule?: string
  /** Identificador próprio do cliente, ecoado nos webhooks (opcional). */
  reference?: string
  /** Remetente, conforme provedor (opcional). */
  from?: string
  /** Tipo de SMS para precificação (opcional). Veja `getSmsTypes()`. */
  smsTypeId?: number
}

export interface BulkMessage {
  phone: string
  message: string
  schedule?: string
  reference?: string
  from?: string
}

export interface SendBulkParams {
  /** Até 5000 mensagens por requisição. */
  messages: BulkMessage[]
  /** URL para callback de status de entrega (opcional). */
  urlCallback?: string
  /** Flash SMS, se o provedor suportar (opcional). */
  flashSms?: boolean
  /** Tipo de SMS para precificação (opcional). */
  smsTypeId?: number
}

export interface SendResult {
  /** UUID do envio. */
  id: string
  quantity: number
  /** `scheduled` quando há agendamento; senão `queued`. */
  status: 'queued' | 'scheduled' | string
  /** Presente e `true` apenas em modo de teste (sandbox). */
  test?: boolean
}

/* -------------------------------------------------------------------------- */
/* Consulta de envios                                                         */
/* -------------------------------------------------------------------------- */

export interface PaginationMeta {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  firstPage: number
  firstPageUrl: string
  lastPageUrl: string
  nextPageUrl: string | null
  previousPageUrl: string | null
}

export interface Paginated<T> {
  meta: PaginationMeta
  data: T[]
}

export interface ListParams {
  page?: number
}

export interface SendListItem {
  id: string
  number: number | null
  date: string | null
  quantity: number
  full_name: string
  created_at: string
  status: string
  type: string
}

/** Contagens por bucket de status de um envio. */
export interface SendSummary {
  total: number
  delivered: number
  failed: number
  inProgress: number
  /** `true` quando nenhum número está mais em andamento. */
  done: boolean
}

export interface SendNumberDetail {
  id: string
  characters: number
  code: string | null
  cost: number
  message: string
  phone: string
  status: string
  template: string | null
  created_at: string
}

export interface SendDetail {
  id: string
  quantity: number
  characters: number
  date: string | null
  total: number
  cost: number
  user: string
  status: string
  type: string
  summary: SendSummary
  phones: SendNumberDetail[]
}

export interface SendNumberItem {
  id: string
  phone: string
  code: string | null
  status: string
  created_at: string
}

export interface NumbersParams {
  /** Filtra por bucket de status. */
  status?: 'delivered' | 'failed' | 'in_progress'
  page?: number
}

/* -------------------------------------------------------------------------- */
/* Conta e catálogo                                                           */
/* -------------------------------------------------------------------------- */

export interface Balance {
  /** Saldo disponível em R$. */
  balance: number
  currency: string
  company: {
    name: string
    document: string | null
  }
}

export interface SmsTypeItem {
  /** Valor a enviar em `smsTypeId`/`sms_type_id`. */
  id: number
  name: string
  /** Preço unitário (R$). */
  price: number
  /** Preço promocional (R$), se houver. */
  sale: number | null
}

export interface AutoRechargeConfig {
  enabled: boolean
  /** Limiar de recarga (R$). */
  threshold: number
  /** Créditos comprados a cada recarga. */
  planQuantity: number
  cardId: string | null
  alertEnabled: boolean
  /** Limiar de alerta de saldo (R$). */
  alertThreshold: number
}

export interface AutoRechargeUpdate {
  enabled?: boolean
  /** Recarrega quando o saldo for ≤ este valor (R$). */
  threshold?: number
  /** Créditos comprados a cada recarga. */
  planQuantity?: number
  cardId?: string
  alertEnabled?: boolean
  /** Envia e-mail quando o saldo for ≤ este valor (R$). */
  alertThreshold?: number
}

export interface WebhookConfig {
  /** URL configurada (`null` = desativado). */
  url: string | null
  /** Segredo HMAC. Assine o corpo bruto p/ validar `X-SMSGo-Signature`. */
  secret: string | null
}

export interface WebhookUpdate {
  /** URL HTTPS do seu endpoint. String vazia desativa o webhook. */
  url?: string
  /** Gera um novo segredo de assinatura. */
  rotateSecret?: boolean
}

/* -------------------------------------------------------------------------- */
/* Faturamento                                                                */
/* -------------------------------------------------------------------------- */

export interface Plan {
  id: string
  quantity: number
  price: number
  sale: number
  /** Preço unitário efetivo (R$). */
  unit: number
  /** Total do pacote (R$). */
  total: number
  popular: boolean
}

export interface Card {
  id: string
  /** Últimos 4 dígitos. */
  number: string
  name: string
  alias: string | null
  /** Validade MM/AA. */
  validate: string
  flag: string
  default: boolean
}

export interface InvoiceItem {
  uuid: string
  total: number
  date: string
  expiry: string
  displayId: number
  status: {
    code: string
    name: string
    icon: string | null
    color: string | null
  } | null
  card: {
    code: string
    name: string
  } | null
}

export interface InvoicesParams {
  page?: number
  perPage?: number
}

export interface PurchaseParams {
  /** Quantidade de créditos (250–1.000.000). Ignorado se `planId` for enviado. */
  quantity?: number
  /** UUID de um pacote (tier). Tem prioridade sobre `quantity`. */
  planId?: string
  /** UUID do cartão salvo (opcional; usa o padrão se omitido). */
  cardId?: string
  /** Código de cupom (opcional). */
  coupon?: string
}

export interface PurchaseResult {
  /** `succeeded` já creditou o saldo; `processing` confirma via webhook. */
  status: 'succeeded' | 'processing' | string
  invoiceUuid: string
  /** Valor cobrado (R$). */
  total: number
  quantity: number
  paymentIntentId: string
}

/* -------------------------------------------------------------------------- */
/* Contatos e listas                                                          */
/* -------------------------------------------------------------------------- */

export interface ContactInput {
  fullName: string
  phone: string
  email?: string
  /** UUIDs das listas às quais associar o contato. */
  lists?: string[]
}

export interface ContactDetail {
  fullName: string
  email: string | null
  phone: string
}

export interface ContactsListParams {
  page: number
  perPage?: number
  search?: string
  /** Filtra contatos por nome de lista. */
  title?: string
}

export interface ListInput {
  /** Nome da lista (2–20 caracteres). */
  name: string
}

export interface ListResult {
  name: string
  id: string
}

export interface ListsListParams {
  page: number
  perPage?: number
  title?: string
}

/* -------------------------------------------------------------------------- */
/* Erros                                                                      */
/* -------------------------------------------------------------------------- */

/** Item de erro de validação por campo. */
export interface FieldError {
  field: string
  message: string
}

/** Erro padronizado lançado pelo SDK em respostas não-2xx. */
export class SMSGoError extends Error {
  /** Status HTTP. */
  readonly status: number
  /** Código estável do erro (ex.: validation_error, insufficient_balance, rate_limited). */
  readonly code: string
  /** Detalhe por campo, presente em `validation_error` (422). */
  readonly errors?: FieldError[]
  /** Corpo bruto da resposta de erro. */
  readonly details: unknown

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
    errors?: FieldError[]
  ) {
    super(message)
    this.name = 'SMSGoError'
    this.status = status
    this.code = code
    this.errors = errors
    this.details = details
  }
}

/* -------------------------------------------------------------------------- */
/* Cliente                                                                    */
/* -------------------------------------------------------------------------- */

const DEFAULT_BASE_URL = 'https://api.smsgo.com.br'
// Token tem validade de 48h; renova com folga aos 47h.
const TOKEN_TTL_MS = 47 * 60 * 60 * 1000

/** Modo de autenticação da chave atual. */
export type AuthMode = 'live' | 'test'

export class SMSGo {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  private token: string | null = null
  private tokenExpiresAt = 0
  private authMode: AuthMode | null = null

  /** Namespace de contatos (CRUD). */
  readonly contacts: ContactsResource
  /** Namespace de listas (CRUD). */
  readonly lists: ListsResource
  /** Namespace de faturamento (pacotes, cartões, faturas, compra). */
  readonly billing: BillingResource

  constructor(options: SMSGoOptions) {
    if (!options?.apiKey) throw new Error('SMSGo: apiKey é obrigatório.')
    this.apiKey = options.apiKey
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')

    const f = options.fetch ?? globalThis.fetch
    if (!f) {
      throw new Error(
        'SMSGo: fetch não encontrado. Use Node 18+ ou passe uma implementação em options.fetch.'
      )
    }
    this.fetchImpl = f

    // Namespaces compartilham o transporte (auth/refresh/erros) do cliente.
    const req = <T>(method: string, path: string, payload?: Record<string, unknown>): Promise<T> =>
      this.request<T>(method, path, payload)
    this.contacts = new ContactsResource(req)
    this.lists = new ListsResource(req)
    this.billing = new BillingResource(req)
  }

  /**
   * Modo da chave atual (`live` ou `test`), conhecido após a 1ª chamada
   * autenticada. Retorna `null` antes disso — use `resolveMode()` para forçar.
   */
  get mode(): AuthMode | null {
    return this.authMode
  }

  /** Garante um token e devolve o modo (`live`/`test`) da chave. */
  async resolveMode(): Promise<AuthMode> {
    await this.ensureToken()
    return this.authMode ?? 'live'
  }

  /* --- SMS ---------------------------------------------------------------- */

  /** Envia um SMS para um número. */
  send(params: SendParams): Promise<SendResult> {
    return this.request<SendResult>('POST', '/v1/sms/send/single', {
      phone: params.phone,
      message: params.message,
      schedule: params.schedule,
      reference: params.reference,
      from: params.from,
      sms_type_id: params.smsTypeId,
    })
  }

  /** Envia várias mensagens numa única transação (até 5000). */
  sendBulk(params: SendBulkParams): Promise<SendResult> {
    return this.request<SendResult>('POST', '/v1/sms/send/multiple', {
      messages: params.messages,
      urlCallback: params.urlCallback,
      flashSms: params.flashSms,
      sms_type_id: params.smsTypeId,
    })
  }

  /** Lista os envios da conta (paginado). */
  list(params: ListParams = {}): Promise<Paginated<SendListItem>> {
    return this.request<Paginated<SendListItem>>(
      'GET',
      `/v1/sms/list${buildQuery({ page: params.page ?? 1 })}`
    )
  }

  /** Detalha um envio pelo seu UUID (inclui `summary` de acompanhamento). */
  get(id: string): Promise<SendDetail> {
    return this.request<SendDetail>('GET', `/v1/sms/${encodeURIComponent(id)}/show`)
  }

  /** Números de um envio, paginado e filtrável por bucket de status. */
  getNumbers(id: string, params: NumbersParams = {}): Promise<Paginated<SendNumberItem>> {
    return this.request<Paginated<SendNumberItem>>(
      'GET',
      `/v1/sms/${encodeURIComponent(id)}/numbers${buildQuery({
        status: params.status,
        page: params.page,
      })}`
    )
  }

  /** Catálogo de tipos de SMS ativos (o `id` é o valor de `smsTypeId`). */
  async getSmsTypes(): Promise<SmsTypeItem[]> {
    const res = await this.request<{ data: SmsTypeItem[] }>('GET', '/v1/sms-types')
    return res.data
  }

  /* --- Conta -------------------------------------------------------------- */

  /** Saldo monetário (R$) + dados básicos da conta. */
  getBalance(): Promise<Balance> {
    return this.request<Balance>('GET', '/v1/account/balance')
  }

  /** Lê a configuração de recarga automática + alerta de saldo. */
  getAutoRecharge(): Promise<AutoRechargeConfig> {
    return this.request<AutoRechargeConfig>('GET', '/v1/account/auto-recharge')
  }

  /**
   * Atualiza recarga automática + alerta de saldo. Para LIGAR a recarga é
   * obrigatório `cardId` + `planQuantity`.
   */
  setAutoRecharge(params: AutoRechargeUpdate): Promise<AutoRechargeConfig> {
    return this.request<AutoRechargeConfig>('PUT', '/v1/account/auto-recharge', {
      enabled: params.enabled,
      threshold: params.threshold,
      plan_quantity: params.planQuantity,
      card_id: params.cardId,
      alert_enabled: params.alertEnabled,
      alert_threshold: params.alertThreshold,
    })
  }

  /** Lê a URL e o segredo do webhook de saída. */
  getWebhook(): Promise<WebhookConfig> {
    return this.request<WebhookConfig>('GET', '/v1/account/webhook')
  }

  /**
   * Define o webhook de saída (DLR + respostas). String vazia em `url` desativa;
   * use `rotateSecret` para girar o segredo de assinatura.
   */
  setWebhook(params: WebhookUpdate): Promise<WebhookConfig> {
    return this.request<WebhookConfig>('PUT', '/v1/account/webhook', {
      url: params.url,
      rotate_secret: params.rotateSecret,
    })
  }

  /* --- Auth interna ------------------------------------------------------- */

  /** Troca a SMSGo-key por um token Bearer; cacheia até expirar. */
  private async ensureToken(forceRefresh = false): Promise<string> {
    const now = Date.now()
    if (!forceRefresh && this.token && now < this.tokenExpiresAt) return this.token

    const res = await this.fetchImpl(`${this.baseUrl}/v1/auth/token`, {
      method: 'GET',
      headers: { 'SMSGo-key': this.apiKey, 'Accept': 'application/json' },
    })

    const body = await this.parseBody(res)
    if (!res.ok || !body?.token) {
      throw this.toError(res.status, body, 'Falha ao autenticar a SMSGo-key.')
    }

    this.token = body.token as string
    this.authMode = body.mode === 'test' ? 'test' : 'live'
    this.tokenExpiresAt = now + TOKEN_TTL_MS
    return this.token
  }

  private async request<T>(
    method: string,
    path: string,
    payload?: Record<string, unknown>,
    isRetry = false
  ): Promise<T> {
    const token = await this.ensureToken()

    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        ...(payload ? { 'Content-Type': 'application/json' } : {}),
      },
      body: payload ? JSON.stringify(stripUndefined(payload)) : undefined,
    })

    // Token expirado/revogado: renova uma vez e tenta de novo.
    if (res.status === 401 && !isRetry) {
      await this.ensureToken(true)
      return this.request<T>(method, path, payload, true)
    }

    const body = await this.parseBody(res)
    if (!res.ok) throw this.toError(res.status, body)
    return body as T
  }

  private async parseBody(res: Response): Promise<any> {
    const text = await res.text()
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  private toError(status: number, body: any, fallbackMessage = 'Erro na requisição.'): SMSGoError {
    const code = (body && typeof body === 'object' && body.code) || httpCodeName(status)
    const message =
      (body && typeof body === 'object' && body.message) ||
      (typeof body === 'string' && body) ||
      fallbackMessage
    const errors =
      body && typeof body === 'object' && Array.isArray(body.errors)
        ? (body.errors as FieldError[])
        : undefined
    return new SMSGoError(status, String(code), String(message), body, errors)
  }
}

/* -------------------------------------------------------------------------- */
/* Namespaces (contatos, listas, faturamento)                                 */
/* -------------------------------------------------------------------------- */

/** Transporte interno compartilhado pelos namespaces (auth/refresh/erros). */
type Requester = <T>(method: string, path: string, payload?: Record<string, unknown>) => Promise<T>

export class ContactsResource {
  constructor(private readonly req: Requester) {}

  /** Lista contatos (paginado; `page` obrigatório). */
  list(params: ContactsListParams): Promise<Paginated<Record<string, unknown>>> {
    return this.req(
      'GET',
      `/v1/contacts/list${buildQuery({
        page: params.page,
        perPage: params.perPage,
        search: params.search,
        title: params.title,
      })}`
    )
  }

  /** Cria (ou faz upsert pelo telefone) um contato. Retorna o UUID. */
  create(input: ContactInput): Promise<string> {
    return this.req('POST', '/v1/contacts/store', contactBody(input))
  }

  /** Detalha um contato pelo UUID. */
  get(id: string): Promise<ContactDetail> {
    return this.req('GET', `/v1/contacts/${encodeURIComponent(id)}/show`)
  }

  /** Atualiza um contato. Retorna o UUID. */
  update(id: string, input: ContactInput): Promise<string> {
    return this.req('PUT', `/v1/contacts/${encodeURIComponent(id)}/update`, contactBody(input))
  }

  /** Exclui um contato. */
  delete(id: string): Promise<{ message: string }> {
    return this.req('DELETE', `/v1/contacts/${encodeURIComponent(id)}/delete`)
  }
}

export class ListsResource {
  constructor(private readonly req: Requester) {}

  /** Lista as listas da conta (paginado; `page` obrigatório). */
  list(params: ListsListParams): Promise<Paginated<Record<string, unknown>>> {
    return this.req(
      'GET',
      `/v1/lists/list${buildQuery({
        page: params.page,
        perPage: params.perPage,
        title: params.title,
      })}`
    )
  }

  /** Cria uma lista. */
  create(input: ListInput): Promise<ListResult> {
    return this.req('POST', '/v1/lists/store', { name: input.name })
  }

  /** Detalha uma lista pelo UUID. */
  get(id: string): Promise<ListResult> {
    return this.req('GET', `/v1/lists/${encodeURIComponent(id)}/show`)
  }

  /** Atualiza uma lista. */
  update(id: string, input: ListInput): Promise<ListResult> {
    return this.req('PUT', `/v1/lists/${encodeURIComponent(id)}/update`, { name: input.name })
  }

  /** Exclui uma lista. */
  delete(id: string): Promise<{ message: string }> {
    return this.req('DELETE', `/v1/lists/${encodeURIComponent(id)}/delete`)
  }
}

export class BillingResource {
  constructor(private readonly req: Requester) {}

  /** Pacotes de recarga (tiers) disponíveis. */
  async plans(): Promise<Plan[]> {
    const res = await this.req<{ data: Plan[] }>('GET', '/v1/billing/plans')
    return res.data
  }

  /** Cartões salvos (apenas os 4 últimos dígitos). */
  async cards(): Promise<Card[]> {
    const res = await this.req<{ data: Card[] }>('GET', '/v1/billing/cards')
    return res.data
  }

  /** Histórico de faturas/recibos (paginado). */
  invoices(params: InvoicesParams = {}): Promise<Paginated<InvoiceItem>> {
    return this.req(
      'GET',
      `/v1/billing/invoices${buildQuery({ page: params.page, perPage: params.perPage })}`
    )
  }

  /**
   * Compra créditos cobrando um cartão salvo (off-session). Informe `quantity`
   * ou `planId`. Sem `cardId`, usa o cartão padrão.
   *
   * ⚠️ Idempotência: cada chamada gera uma cobrança nova. Em timeout, consulte
   * `invoices()` antes de repetir — não faça retry cego.
   */
  purchase(params: PurchaseParams): Promise<PurchaseResult> {
    return this.req('POST', '/v1/billing/purchase', {
      quantity: params.quantity,
      plan_id: params.planId,
      card_id: params.cardId,
      coupon: params.coupon,
    })
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function contactBody(input: ContactInput): Record<string, unknown> {
  return {
    full_name: input.fullName,
    phone: input.phone,
    email: input.email,
    lists: input.lists,
  }
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out
}

/** Monta uma query string (`?a=1&b=2`), ignorando valores `undefined`/`null`. */
function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) usp.append(k, String(v))
  }
  const qs = usp.toString()
  return qs ? `?${qs}` : ''
}

function httpCodeName(status: number): string {
  switch (status) {
    case 400:
      return 'bad_request'
    case 401:
      return 'unauthorized'
    case 402:
      return 'insufficient_balance'
    case 409:
      return 'provider_out_of_stock'
    case 422:
      return 'validation_error'
    case 429:
      return 'rate_limited'
    case 503:
      return 'payment_unavailable'
    default:
      return `http_${status}`
  }
}

/* -------------------------------------------------------------------------- */
/* Webhooks — verificação de assinatura                                       */
/* -------------------------------------------------------------------------- */

/**
 * Verifica a assinatura `X-SMSGo-Signature` de um webhook de saída.
 *
 * Recalcula o HMAC-SHA256 do **corpo bruto** (exatamente os bytes recebidos, antes
 * de qualquer parse/reserialização) com o seu `secret` e compara, em tempo constante,
 * com o header. Retorna `false` (sem lançar) quando a assinatura está ausente,
 * malformada ou não confere.
 *
 * @param rawBody          Corpo bruto da requisição (string ou Buffer/Uint8Array).
 * @param signatureHeader  Valor do header `X-SMSGo-Signature` (formato `sha256=<hex>`).
 * @param secret           Segredo do webhook (`whsec_…`), de `getWebhook()`/`setWebhook()`.
 *
 * @example
 * import { verifyWebhookSignature } from '@orynlabs/smsgo'
 * const ok = verifyWebhookSignature(rawBody, req.headers['x-smsgo-signature'], secret)
 * if (!ok) { res.writeHead(401).end(); return }
 */
export function verifyWebhookSignature(
  rawBody: string | Uint8Array,
  signatureHeader: string | null | undefined,
  secret: string,
  opts?: { toleranceSeconds?: number }
): boolean {
  if (!signatureHeader || !secret) return false
  const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(signatureHeader)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false

  // Anti-replay opcional: além da assinatura, exige que o `sentAt` do corpo
  // esteja dentro de uma janela de frescor (segundos). Deduplique também pelo
  // `id` do corpo para idempotência. Sem `toleranceSeconds`, o comportamento é
  // idêntico ao anterior (só assinatura).
  if (opts?.toleranceSeconds != null) {
    try {
      const text = typeof rawBody === 'string' ? rawBody : Buffer.from(rawBody).toString('utf8')
      const sentAt = Date.parse(JSON.parse(text)?.sentAt)
      if (!Number.isFinite(sentAt)) return false
      if (Math.abs(Date.now() - sentAt) > opts.toleranceSeconds * 1000) return false
    } catch {
      return false
    }
  }
  return true
}

export default SMSGo
