import 'server-only';

import QRCode from 'qrcode';

function evolutionConfig() {
  const baseUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
  const apiKey = process.env.EVOLUTION_API_KEY;
  if (!baseUrl || !apiKey) throw new Error('Evolution API ainda não configurada no servidor.');
  return { baseUrl, apiKey };
}

export function evolutionIsConfigured() {
  return Boolean(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY);
}

export async function evolutionRequest(path: string, init: RequestInit = {}) {
  const { baseUrl, apiKey } = evolutionConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      apikey: apiKey,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let body: unknown = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { message: text }; }
  if (!response.ok) {
    const detail = typeof body === 'object' && body !== null && 'response' in body ? JSON.stringify((body as { response: unknown }).response) : text;
    throw new Error(`Evolution API (${response.status}): ${detail || 'falha na requisição'}`);
  }
  return body as Record<string, unknown>;
}

export async function qrDataUrl(payload: Record<string, unknown>) {
  const direct = payload.base64 ?? (payload.qrcode as Record<string, unknown> | undefined)?.base64;
  if (typeof direct === 'string' && direct) return direct.startsWith('data:') ? direct : `data:image/png;base64,${direct}`;
  const code = payload.code ?? (payload.qrcode as Record<string, unknown> | undefined)?.code;
  if (typeof code !== 'string' || !code) return null;
  return QRCode.toDataURL(code, { width: 320, margin: 2, errorCorrectionLevel: 'M' });
}
