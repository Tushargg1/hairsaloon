/**
 * Shared shell for the static legal documents. Keeps the prose styling in one place
 * so Terms, Privacy, and Refund pages stay visually consistent.
 */
export default function LegalPage({ title, updated, children }) {
  return (
    <main className="max-w-[900px] mx-auto px-4 py-12">
      <div className="mb-8">
        <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-2">Legal</p>
        <h1 className="font-display text-headline-md text-on-surface">{title}</h1>
        {updated && (
          <p className="font-body text-label-sm text-outline mt-2">Last updated: {updated}</p>
        )}
      </div>
      <div className="glass-panel rounded-xl p-6 md:p-10 legal-prose">
        {children}
      </div>
    </main>
  )
}
