import { OcrPortal } from '@/components/ocr-portal';

export default function Page() {
  return (
    <main className="app-shell">
      <div className="background-glow background-glow-left" />
      <div className="background-glow background-glow-right" />

      <header className="topbar">
        <div>
          <div className="brand">OCR Portal</div>
          <div className="topbar-copy">Upload, extract, search, and export documents from one dashboard.</div>
        </div>
        <div className="topbar-badges">
          <span className="pill">Production MVP</span>
          <span className="pill pill-soft">FastAPI + Next.js</span>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">Built for the VPS deployment path</div>
          <h1>Clean OCR workflow, clearer UI, and a simpler MVP path.</h1>
          <p>
            The app now runs in inline mode by default, so you can use it without Docker or Redis. Upload a file,
            wait for OCR, search the extracted text, and export the result to Word or PDF.
          </p>
        </div>
        <div className="hero-stats">
          <div className="stat-card">
            <span>Upload limit</span>
            <strong>20 MB</strong>
          </div>
          <div className="stat-card">
            <span>Page limit</span>
            <strong>20 pages</strong>
          </div>
          <div className="stat-card">
            <span>Queue mode</span>
            <strong>Inline</strong>
          </div>
        </div>
      </section>

      <OcrPortal />
    </main>
  );
}
