'use client';

import { useEffect, useMemo, useState } from 'react';

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

type DocumentItem = {
  id: string;
  original_filename: string;
  mime_type: string;
  status: string;
  language: string | null;
  page_count: number;
  file_size: number;
  extracted_text: string | null;
  error_message: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export function OcrPortal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Idle');
  const [selected, setSelected] = useState<DocumentItem | null>(null);

  useEffect(() => {
    const savedToken = window.localStorage.getItem('ocr-access-token');
    if (savedToken) {
      setToken(savedToken);
      void loadDocuments(savedToken);
    }
  }, []);

  const authHeaders = useMemo(() => ({ Authorization: token ? `Bearer ${token}` : '' }), [token]);

  async function register() {
    setStatus('Registering...');
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = (await response.json()) as TokenResponse & { detail?: string };
    if (!response.ok) {
      setStatus(data.detail ?? 'Registration failed');
      return;
    }
    persistToken(data.access_token);
    setStatus('Registered and logged in');
  }

  async function login() {
    setStatus('Logging in...');
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = (await response.json()) as TokenResponse & { detail?: string };
    if (!response.ok) {
      setStatus(data.detail ?? 'Login failed');
      return;
    }
    persistToken(data.access_token);
    setStatus('Logged in');
  }

  function persistToken(accessToken: string) {
    window.localStorage.setItem('ocr-access-token', accessToken);
    setToken(accessToken);
    void loadDocuments(accessToken);
  }

  async function loadDocuments(accessToken = token) {
    if (!accessToken) {
      return;
    }
    const response = await fetch(`${API_URL}/documents`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await response.json()) as DocumentItem[] & { detail?: string };
    if (response.ok) {
      setDocuments(data);
    }
  }

  async function upload(file: File | null) {
    if (!file || !token) {
      return;
    }
    setStatus('Uploading...');
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: authHeaders,
      body: form,
    });
    const data = (await response.json()) as DocumentItem & { detail?: string };
    if (!response.ok) {
      setStatus(data.detail ?? 'Upload failed');
      return;
    }
    setStatus('Queued for OCR');
    await loadDocuments();
  }

  async function search() {
    if (!token || !query.trim()) {
      return;
    }
    setStatus('Searching...');
    const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await response.json()) as DocumentItem[];
    if (response.ok) {
      setDocuments(data);
      setStatus(`Found ${data.length} document(s)`);
    }
  }

  async function exportDocument(format: 'word' | 'pdf') {
    if (!token || !selected) {
      return;
    }
    const response = await fetch(`${API_URL}/documents/${selected.id}/export/${format === 'word' ? 'word' : 'pdf'}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await response.json()) as { download_url?: string; detail?: string };
    if (!response.ok) {
      setStatus(data.detail ?? 'Export failed');
      return;
    }
    if (data.download_url) {
      window.open(data.download_url, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h2 className="text-2xl font-semibold text-white">Auth</h2>
        <div className="mt-4 space-y-3">
          <input className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <button className="rounded-xl bg-cyan-500 px-4 py-3 font-medium text-slate-950" onClick={login}>Login</button>
            <button className="rounded-xl border border-cyan-400/40 px-4 py-3 font-medium text-cyan-200" onClick={register}>Register</button>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <h2 className="text-2xl font-semibold text-white">Upload</h2>
          <input className="block w-full rounded-xl border border-dashed border-white/15 bg-slate-900 px-4 py-3 text-sm text-slate-200" type="file" onChange={(event) => void upload(event.target.files?.[0] ?? null)} />
        </div>

        <div className="mt-8 space-y-3">
          <h2 className="text-2xl font-semibold text-white">Search</h2>
          <input className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white" placeholder="Search extracted text" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="rounded-xl bg-white px-4 py-3 font-medium text-slate-950" onClick={search}>Search</button>
        </div>

        <p className="mt-8 text-sm text-slate-300">{status}</p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Documents</h2>
          <button className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200" onClick={() => void loadDocuments()}>Refresh</button>
        </div>

        <div className="mt-4 grid gap-4">
          {documents.map((document) => (
            <button
              key={document.id}
              className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-left"
              onClick={() => setSelected(document)}
            >
              <div className="flex items-center justify-between gap-4">
                <strong className="text-white">{document.original_filename}</strong>
                <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs text-cyan-200">{document.status}</span>
              </div>
              <div className="mt-2 text-sm text-slate-300">
                {document.mime_type} | {document.page_count} pages | {document.language ?? 'unknown'}
              </div>
            </button>
          ))}
        </div>

        {selected ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950 p-4">
            <h3 className="text-lg font-semibold text-white">Extracted text</h3>
            <div className="mt-3 flex gap-3">
              <button className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200" onClick={() => void exportDocument('word')}>Export Word</button>
              <button className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200" onClick={() => void exportDocument('pdf')}>Export PDF</button>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">{selected.extracted_text ?? 'No text yet. OCR is still running or the file failed.'}</p>
            {selected.error_message ? <p className="mt-3 text-sm text-red-300">{selected.error_message}</p> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
