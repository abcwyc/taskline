'use client';

/**
 * Client-side workspace-settings API. Typed views over the JSON documents
 * stored by /api/settings (see lib/api/workspace-settings.server.ts).
 */

async function http<T>(url: string, init?: RequestInit): Promise<T> {
   const res = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
   if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status} ${detail}`.trim());
   }
   return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export interface AiSetting {
   enabled: boolean;
   model: string;
   systemPrompt: string;
}

export interface SlaPolicy {
   priority: 'urgent' | 'high' | 'medium' | 'low';
   respondHours: number;
   resolveHours: number;
}

export interface EmojiAlias {
   name: string;
   emoji: string;
}

export async function fetchAiSetting(): Promise<AiSetting> {
   return http<AiSetting>('/api/settings?key=ai');
}

export async function fetchSlas(): Promise<SlaPolicy[]> {
   return http<SlaPolicy[]>('/api/settings?key=slas');
}

export async function fetchEmojis(): Promise<EmojiAlias[]> {
   return http<EmojiAlias[]>('/api/settings?key=emojis');
}

export async function putSetting(key: 'ai' | 'slas' | 'emojis', value: unknown): Promise<void> {
   await http<void>('/api/settings', { method: 'PUT', body: JSON.stringify({ key, value }) });
}
