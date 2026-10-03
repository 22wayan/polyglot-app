import React, { useState } from 'react';
import { Key, Loader2 } from 'lucide-react';
import * as ai from '../ai';
import { getUserKey, setUserKey, looksLikeAnthropicKey, maskKey } from '../apiKey';

const BORDER = 'rgba(232,220,196,0.1)';

// Bring your own key: each user enters their own Anthropic key. It is stored
// only in this browser and sent only to api.anthropic.com.
export function ApiKeyCard({ hasApiKey, onKeyChange }) {
  const [draft, setDraft] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const ownKey = getUserKey();

  const save = async () => {
    const key = draft.trim();
    if (!looksLikeAnthropicKey(key)) {
      setError('Das sieht nicht nach einem Anthropic-Key aus (beginnt mit sk-ant-).');
      return;
    }
    setChecking(true);
    setError(null);
    const result = await ai.verifyUserKey(key);
    setChecking(false);
    if (!result.ok) { setError(result.reason); return; }
    setUserKey(key);
    setDraft('');
    onKeyChange();
  };

  const remove = () => {
    setUserKey('');
    onKeyChange();
  };

  return (
    <div className="rounded-2xl p-4 mb-3" style={{ background: hasApiKey ? '#4ADE8010' : 'rgba(232,220,196,0.025)', border: `1px solid ${hasApiKey ? '#4ADE8030' : 'rgba(232,220,196,0.08)'}` }}>
      <div className="flex items-center gap-2 mb-2">
        <Key size={14} style={{ color: hasApiKey ? '#4ADE80' : '#E8DCC4', opacity: 0.7 }} aria-hidden="true" />
        <div className="font-display text-[14px]">KI-Features {hasApiKey ? '· aktiv' : '· gesperrt'}</div>
      </div>

      {ownKey ? (
        <>
          <div className="text-[12px] opacity-80 leading-relaxed mb-3">
            Dein eigener Key <span className="font-mono">{maskKey(ownKey)}</span> ist aktiv. Stories, Chat und Karten-Generator laufen über dein Anthropic-Konto.
          </div>
          <button onClick={remove} className="w-full py-2.5 rounded-xl min-h-[44px] font-mono text-[10px] uppercase tracking-wider" style={{ background: 'rgba(232,220,196,0.04)', border: `1px solid ${BORDER}` }}>
            Key von diesem Gerät entfernen
          </button>
        </>
      ) : (
        <>
          <div className="text-[12px] opacity-80 leading-relaxed mb-3">
            {hasApiKey
              ? 'Dieser Server stellt einen Key bereit. Du kannst stattdessen deinen eigenen eintragen.'
              : 'Stories, Chat und Karten-Generator brauchen deinen eigenen Anthropic-Key.'}
            {' '}Er bleibt auf diesem Gerät und geht nur an Anthropic. Einen Key bekommst du auf{' '}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="underline">console.anthropic.com</a>.
          </div>
          <label htmlFor="api-key-input" className="sr-only">Anthropic-API-Key</label>
          <input
            id="api-key-input"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-ant-…"
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
            className="w-full mb-2 px-3 py-2.5 rounded-xl font-mono text-[12px] min-h-[44px]"
            style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${BORDER}`, color: '#E8DCC4' }}
          />
          <button onClick={save} disabled={checking || !draft.trim()} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl min-h-[44px] disabled:opacity-40" style={{ background: '#E8DCC4', color: '#141210' }}>
            {checking && <Loader2 size={13} className="animate-spin" />}
            <span className="font-mono text-[10px] uppercase tracking-wider">{checking ? 'Prüfe Key' : 'Key prüfen und speichern'}</span>
          </button>
          {error && <div role="alert" className="mt-2 font-mono text-[11px]" style={{ color: '#FF6B6B' }}>{error}</div>}
        </>
      )}
    </div>
  );
}
