import { useQuery } from '@tanstack/react-query'
import { getAllSalons, salonKeys } from './salon-api.js'
import { salonUrl } from './platform-config.js'
import GlassPanel from '../shared/components/GlassPanel.jsx'
import Icon from '../shared/components/Icon.jsx'
import AdminNav from './AdminNav.jsx'

export default function AdminSalons() {
  const salonsQuery = useQuery({ queryKey: ['admin-salons'], queryFn: getAllSalons })

  function formatDate(iso) {
    if (!iso) return '—'
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
  }

  return (
    <main className="max-w-[1280px] mx-auto px-4 py-12">
      <AdminNav />
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-1">Platform administration</p>
          <h1 className="font-display text-headline-md text-on-surface">All Salons</h1>
        </div>
        <div className="glass-panel rounded-lg px-6 py-4 text-center amber-glow">
          <strong className="font-display text-headline-md text-secondary-fixed block">{salonsQuery.data?.length ?? '—'}</strong>
          <span className="font-body text-label-sm text-on-surface-variant">Total salons</span>
        </div>
      </div>

      {salonsQuery.isLoading ? (
        <div className="flex flex-col gap-4">{[1, 2, 3].map((i) => <div key={i} className="glass-surface metallic-border rounded-lg h-20 animate-pulse" />)}</div>
      ) : salonsQuery.isError ? (
        <GlassPanel className="text-center"><p className="text-error">Failed to load salons.</p></GlassPanel>
      ) : !salonsQuery.data?.length ? (
        <GlassPanel className="text-center"><p className="text-on-surface-variant">No salons registered yet.</p></GlassPanel>
      ) : (
        <div className="flex flex-col gap-3">
          {salonsQuery.data.map((salon) => (
            <div key={salon.id} className="glass-surface metallic-border rounded-lg p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant/50 flex-shrink-0">
                <span className="font-display text-secondary text-sm">{salon.name?.[0] || 'S'}</span>
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-title-md text-on-surface truncate">{salon.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full font-body text-[10px] uppercase ${salon.status === 'ACTIVE' ? 'bg-[rgba(52,211,153,0.15)] text-[#34d399]' : 'bg-[rgba(168,144,72,0.15)] text-[#A89048]'}`}>
                    {salon.status}
                  </span>
                </div>
                <p className="font-body text-label-sm text-on-surface-variant">{salon.city || '—'} · {salon.phone || '—'}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-body text-label-sm text-on-surface-variant">Registered</p>
                <p className="font-body text-body-sm text-on-surface">{formatDate(salon.createdAt)}</p>
              </div>
              <a href={salonUrl(salon.subdomain)} target="_blank" rel="noreferrer"
                className="flex-shrink-0 text-secondary hover:text-secondary-fixed transition-colors">
                <Icon name="open_in_new" className="text-[18px]" />
              </a>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
