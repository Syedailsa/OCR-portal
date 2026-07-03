'use client';

import { useEffect, useState } from 'react';

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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.ocr-portal.27.jugaar.ai';

export function OcrPortal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Idle');
  const [selected, setSelected] = useState<DocumentItem | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const signedIn = Boolean(token);
  const selectedCount = documents.length;

  useEffect(() => {
    const savedToken = window.localStorage.getItem('ocr-access-token');
    if (savedToken) {
      setToken(savedToken);
      void loadDocuments(savedToken);
    }
  }, []);

  async function apiJson<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: T & { detail?: string }; response: Response }> {
    try {
      const response = await fetch(url, init);
      const data = (await response.json()) as T & { detail?: string };
      return { ok: response.ok, data, response };
    } catch {
      return {
        ok: false,
        data: { detail: 'Network error. Check API URL or CORS.' } as T & { detail?: string },
        response: new Response(null, { status: 500 }),
      };
    }
  }

  function persistToken(accessToken: string) {
    window.localStorage.setItem('ocr-access-token', accessToken);
    setToken(accessToken);
    void loadDocuments(accessToken);
  }

  async function register() {
    if (!email || !password) {
      setStatus('Enter email and password first');
      return;
    }
    setStatus('Creating account...');
    const { ok, data } = await apiJson<TokenResponse>(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!ok) {
      setStatus(data.detail ?? 'Registration failed');
      return;
    }
    persistToken(data.access_token);
    setStatus('Account created and signed in');
  }

  async function login() {
    if (!email || !password) {
      setStatus('Enter email and password first');
      return;
    }
    setStatus('Signing in...');
    const { ok, data } = await apiJson<TokenResponse>(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!ok) {
      setStatus(data.detail ?? 'Login failed');
      return;
    }
    persistToken(data.access_token);
    setStatus('Signed in');
  }

  async function loadDocuments(accessToken = token) {
    if (!accessToken) return;
    const response = await fetch(`${API_URL}/documents`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      setStatus('Could not load documents');
      return;
    }
    const data = (await response.json()) as DocumentItem[];
    setDocuments(data);
    if (data.length > 0 && !selected) {
      setSelected(data[0]);
    }
  }

  async function upload() {
    if (!pendingFile) {
      setStatus('Choose a file first');
      return;
    }
    if (!token) {
      setStatus('Sign in before uploading');
      return;
    }
    setStatus('Uploading and extracting...');
    const form = new FormData();
    form.append('file', pendingFile);
    const response = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = (await response.json()) as DocumentItem & { detail?: string };
    if (!response.ok) {
      setStatus(data.detail ?? 'Upload failed');
      return;
    }
    setPendingFile(null);
    setStatus('Document saved');
    await loadDocuments();
    setSelected(data);
  }

  async function search() {
    if (!token) {
      setStatus('Sign in before searching');
      return;
    }
    if (!query.trim()) {
      await loadDocuments();
      return;
    }
    setStatus('Searching extracted text...');
    const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      setStatus('Search failed');
      return;
    }
    const data = (await response.json()) as DocumentItem[];
    setDocuments(data);
    setSelected(data[0] ?? null);
    setStatus(`Found ${data.length} result(s)`);
  }

  async function exportDocument(format: 'word' | 'pdf') {
    if (!token || !selected) {
      setStatus('Select a document first');
      return;
    }
    const response = await fetch(
      `${API_URL}/documents/${selected.id}/export/${format === 'word' ? 'word' : 'pdf'}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!response.ok) {
      const payload = (await response.json()) as { detail?: string };
      setStatus(payload.detail ?? 'Export failed');
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = format === 'word' ? `${selected.original_filename.replace(/\.[^.]+$/, '')}.docx` : `${selected.original_filename.replace(/\.[^.]+$/, '')}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    setStatus(`Exported ${format.toUpperCase()}`);
  }

  async function reprocessSelected() {
    if (!token || !selected) {
      setStatus('Select a document first');
      return;
    }
    setStatus('Reprocessing OCR...');
    const response = await fetch(`${API_URL}/documents/${selected.id}/reprocess`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      setStatus('Reprocess failed');
      return;
    }
    await loadDocuments();
    setStatus('Reprocessing started');
  }

  return (
    <div className="portal-grid">
      <aside className="stack-lg">
        <section className="panel hero-panel">
          <div className="eyebrow">OCR Portal</div>
          <h2 className="section-title">One place for upload, OCR, search, and export.</h2>
          <p className="muted">
            Designed for the MVP path: fast login, inline OCR, PostgreSQL storage, and clean export to Word or PDF.
          </p>
          <div className="chip-row">
            <span className="chip">Max upload: 20 MB</span>
            <span className="chip">Max pages: 20</span>
            <span className="chip">Mode: inline OCR</span>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Account</div>
              <div className="panel-subtitle">Create an account, then sign in.</div>
            </div>
            <span className={`status-pill ${signedIn ? 'status-ok' : 'status-warn'}`}>{signedIn ? 'Signed in' : 'Signed out'}</span>
          </div>

          <div className="form-grid">
            <input className="field" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="field" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div className="button-row">
            <button className="btn btn-primary" onClick={login}>Login</button>
            <button className="btn btn-secondary" onClick={register}>Register</button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Upload</div>
              <div className="panel-subtitle">Images and PDFs only.</div>
            </div>
            <span className="status-pill">VPS disk</span>
          </div>

          <label className="dropzone">
            <input
              className="hidden-input"
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp,image/tiff"
              onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
            />
            <span className="dropzone-title">{pendingFile ? pendingFile.name : 'Choose a document to upload'}</span>
            <span className="dropzone-subtitle">PDF, PNG, JPG, TIFF, WebP</span>
          </label>

          <div className="button-row">
            <button className="btn btn-primary" onClick={upload}>Upload & OCR</button>
            <button className="btn btn-ghost" onClick={() => setPendingFile(null)}>Clear</button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Search</div>
              <div className="panel-subtitle">Search extracted text across your documents.</div>
            </div>
            <span className="status-pill">{selectedCount} docs</span>
          </div>

          <div className="search-row">
            <input className="field" placeholder="Try: invoice, passport, receipt" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button className="btn btn-primary" onClick={search}>Search</button>
          </div>
        </section>

        <section className="panel subtle-panel">
          <div className="panel-title">Status</div>
          <p className="status-text">{status}</p>
        </section>
      </aside>

      <main className="stack-lg">
        <section className="panel workspace-panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Workspace</div>
              <div className="panel-subtitle">Select a document to inspect OCR output.</div>
            </div>
            <div className="button-row compact">
              <button className="btn btn-ghost" onClick={() => void loadDocuments()}>Refresh</button>
              <button className="btn btn-ghost" onClick={reprocessSelected}>Reprocess</button>
            </div>
          </div>

          <div className="doc-grid">
            {documents.map((document) => (
              <button
                key={document.id}
                className={`doc-card ${selected?.id === document.id ? 'doc-card-active' : ''}`}
                onClick={() => setSelected(document)}
              >
                <div className="doc-card-top">
                  <strong className="doc-name">{document.original_filename}</strong>
                  <span className={`status-pill ${document.status === 'completed' ? 'status-ok' : document.status === 'failed' ? 'status-bad' : 'status-warn'}`}>
                    {document.status}
                  </span>
                </div>
                <div className="doc-meta">
                  <span>{document.mime_type}</span>
                  <span>{document.page_count || 0} pages</span>
                  <span>{document.language ?? 'lang unknown'}</span>
                </div>
                <div className="doc-snippet">
                  {document.extracted_text?.slice(0, 140) || 'OCR text will appear here after processing.'}
                </div>
              </button>
            ))}

            {documents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-title">No documents yet</div>
                <div className="empty-copy">Upload a file to see OCR results, search hits, and export buttons here.</div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel detail-panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Document details</div>
              <div className="panel-subtitle">Full extracted text and export controls.</div>
            </div>
            {selected ? <span className="status-pill">{selected.original_filename}</span> : null}
          </div>

          {selected ? (
            <>
              <div className="detail-metrics">
                <div className="metric">
                  <span className="metric-label">Pages</span>
                  <strong>{selected.page_count || 0}</strong>
                </div>
                <div className="metric">
                  <span className="metric-label">Language</span>
                  <strong>{selected.language ?? 'unknown'}</strong>
                </div>
                <div className="metric">
                  <span className="metric-label">Size</span>
                  <strong>{Math.max(1, Math.round(selected.file_size / 1024))} KB</strong>
                </div>
              </div>

              <div className="button-row compact">
                <button className="btn btn-primary" onClick={() => void exportDocument('word')}>Export Word</button>
                <button className="btn btn-primary" onClick={() => void exportDocument('pdf')}>Export PDF</button>
              </div>

              <div className="text-box">
                <pre>{selected.extracted_text ?? 'No OCR text is available yet.'}</pre>
              </div>

              {selected.error_message ? <div className="error-box">{selected.error_message}</div> : null}
            </>
          ) : (
            <div className="empty-state large">
              <div className="empty-title">Pick a document</div>
              <div className="empty-copy">Once a file is selected, its OCR text, export buttons, and error details appear here.</div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
