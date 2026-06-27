/**
 * SDK oficial da SMSGo para Node.js / TypeScript.
 *
 * Cuida da autenticação de 2 passos (SMSGo-key → token Bearer de 48h) de forma
 * transparente: você só passa a `apiKey`. O token é buscado sob demanda, cacheado
 * e renovado automaticamente quando expira ou retorna 401.
 *
 * @example
 * import { SMSGo } from '@smsgo/sdk'
 * const smsgo = new SMSGo({ apiKey: process.env.SMSGO_KEY! })
 * await smsgo.send({ phone: '+5511999990000', message: 'Olá do SMSGo' })
 */

export interface SMSGoOptions {
  /** Chave permanente da conta (painel → Minha conta → API). */
  apiKey: string
  /** Base da API. Default: https://api.smsgo.com.br */
  baseUrl?: string
  /** Implementação de fetch (default: fetch global do Node 18+). */
  fetch?: typeof fetch
}

export interface SendParams {
  /** Número em formato internacional E.164, ex.: +5511999990000. */
  phone: string
  /** Texto da mensagem. */
  message: string
  /** Agendamento ISO-8601 (opcional). */
  schedule?: string
  /** Identificador próprio do cliente (opcional). */
  reference?: string
  /** Remetente, conforme provedor (opcional). */
  from?: string
  /** Tipo de SMS para precificação (opcional). */
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
  messages: BulkMessage[]
  /** URL para callback de status de entrega (opcional). */
  urlCallback?: string
  /** Flash SMS, se o provedor suportar (opcional). */
  flashSms?: boolean
  smsTypeId?: number
}

export interface SendResult {
  id: string
  quantity: number
  status: string
}

export interface ListParams {
  page?: number
}

/** Erro padronizado lançado pelo SDK em respostas não-2xx. */
export class SMSGoError extends Error {
  /** Status HTTP. */
  readonly status: number
  /** Código estável do erro (ex.: validation_error, insufficient_balance, rate_limited). */
  readonly code: string
  /** Corpo bruto da resposta de erro. */
  readonly details: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'SMSGoError'
    this.status = status
    this.code = code
    this.details = details
  }
}

const DEFAULT_BASE_URL = 'https://api.smsgo.com.br'
// Token tem validade de 48h; renova com folga aos 47h.
const TOKEN_TTL_MS = 47 * 60 * 60 * 1000

export class SMSGo {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  private token: string | null = null
  private tokenExpiresAt = 0

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
  }

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

  /** Envia várias mensagens numa única transação. */
  sendBulk(params: SendBulkParams): Promise<SendResult> {
    return this.request<SendResult>('POST', '/v1/sms/send/multiple', {
      messages: params.messages,
      urlCallback: params.urlCallback,
      flashSms: params.flashSms,
      sms_type_id: params.smsTypeId,
    })
  }

  /** Lista os envios da conta (paginado). */
  list(params: ListParams = {}): Promise<unknown> {
    const page = params.page ?? 1
    return this.request<unknown>('GET', `/v1/sms/list?page=${encodeURIComponent(page)}`)
  }

  /** Detalha um envio pelo seu UUID. */
  get(id: string): Promise<unknown> {
    return this.request<unknown>('GET', `/v1/sms/${encodeURIComponent(id)}/show`)
  }

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
    return new SMSGoError(status, String(code), String(message), body)
  }
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out
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
    default:
      return `http_${status}`
  }
}

export default SMSGo
