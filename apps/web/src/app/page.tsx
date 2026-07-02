import { OcrPortal } from '@/components/ocr-portal';

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <div className="max-w-3xl space-y-6">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">OCR Portal</p>
          <h1 className="text-5xl font-semibold leading-tight text-white sm:text-6xl">
            Production OCR pipeline for uploads, extraction, search, and export.
          </h1>
          <p className="text-lg leading-8 text-slate-300">
            Frontend is wired to the API container. The backend, worker, PostgreSQL, and Redis run in Docker.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {['JWT auth', 'Async OCR jobs', 'VPS disk storage', 'PostgreSQL search'].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12">
          <OcrPortal />
        </div>
      </section>
    </main>
  );
}
