import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getAllCustomers, getCustomerDetail } from './salon-api.js'
import GlassPanel from '../shared/components/GlassPanel.jsx'
import Icon from '../shared/components/Icon.jsx'
import AdminNav from './AdminNav.jsx'

function formatDate(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

function CustomerDetail({ customerId, onBack }) {
  const query = useQuery({ queryKey: ['admin-customer', customerId], queryFn: () => getCustomerDetail(customerId) })

  if (query.isLoading) return <div className="animate-pulse h-40 glass-surface metallic-border rounded-lg" />
  if (query.isError) return <GlassPanel><p className="text-error">Failed to load customer details.</p></GlassPanel>

  const customer = query.data
  return (
    <div>
      <button onClick={onBack} className="font-body text-label-md text-secondary hover:text-secondary-fixed mb-4 flex items-center gap-1">
        <Icon name="arrow_back" className="text-[16px]" /> Back to customers
      </button>

      <GlassPanel className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant/50">
            <span className="font-display text-secondary text-lg">{customer.name?.[0] || '?'}</span>
          </div>
          <div>
            <h2 className="font-display text-title-lg text-on-surface">{customer.name || 'Unnamed'}</h2>
            <p className="font-body text-label-sm text-on-surface-variant">{customer.phone} · {customer.email || 'No email'}</p>
          </div>
        </div>
        <p className="font-body text-label-sm text-on-surface-variant">Member since {formatDate(customer.createdAt)}</p>
      </GlassPanel>

      <h3 className="font-display text-title-md text-on-surface mb-3">Booking History ({customer.bookings?.length || 0})</h3>

      {!customer.bookings?.length ? (
        <GlassPanel className="text-center"><p className="text-on-surface-variant">No bookings yet.</p></GlassPanel>
      ) : (
        <div className="flex flex-col gap-2">
          {customer.bookings.map((b) => (
            <div key={b.id} className="glass-surface metallic-border rounded-lg p-4 flex items-center gap-4">
              <div className="flex-grow min-w-0">
                <p className="font-body text-body-md text-on-surface truncate">{b.serviceName}</p>
                <p className="font-body text-label-sm text-on-surface-variant">
                  {b.salonName || 'Unknown salon'} · {formatDateTime(b.startDatetime)}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-body text-body-sm text-on-surface">₹{Number(b.price || 0).toFixed(0)}</p>
                <span className={`font-body text-[10px] uppercase px-2 py-0.5 rounded-full ${
                  b.status === 'COMPLETED' ? 'bg-[rgba(52,211,153,0.15)] text-[#34d399]' :
                  b.status === 'CANCELLED' ? 'bg-[rgba(255,100,100,0.15)] text-[#ff6464]' :
                  'bg-[rgba(168,144,72,0.15)] text-[#A89048]'
                }`}>{b.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminCustomers() {
  const [selectedId, setSelectedId] = useState(null)
  const customersQuery = useQuery({ queryKey: ['admin-customers'], queryFn: getAllCustomers })

  if (selectedId) {
    return (
      <main className="max-w-[1280px] mx-auto px-4 py-12">
        <AdminNav />
        <CustomerDetail customerId={selectedId} onBack={() => setSelectedId(null)} />
      </main>
    )
  }

  return (
    <main className="max-w-[1280px] mx-auto px-4 py-12">
      <AdminNav />
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-1">Platform administration</p>
          <h1 className="font-display text-headline-md text-on-surface">All Customers</h1>
        </div>
        <div className="glass-panel rounded-lg px-6 py-4 text-center amber-glow">
          <strong className="font-display text-headline-md text-secondary-fixed block">{customersQuery.data?.length ?? '—'}</strong>
          <span className="font-body text-label-sm text-on-surface-variant">Total customers</span>
        </div>
      </div>

      {customersQuery.isLoading ? (
        <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <div key={i} className="glass-surface metallic-border rounded-lg h-16 animate-pulse" />)}</div>
      ) : customersQuery.isError ? (
        <GlassPanel className="text-center"><p className="text-error">Failed to load customers.</p></GlassPanel>
      ) : !customersQuery.data?.length ? (
        <GlassPanel className="text-center"><p className="text-on-surface-variant">No customers registered yet.</p></GlassPanel>
      ) : (
        <div className="flex flex-col gap-2">
          {customersQuery.data.map((customer) => (
            <button key={customer.id} onClick={() => setSelectedId(customer.id)}
              className="glass-surface metallic-border rounded-lg p-4 flex items-center gap-4 w-full text-left hover:border-secondary/50 transition-colors">
              <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant/50 flex-shrink-0">
                <span className="font-display text-secondary text-sm">{customer.name?.[0] || '?'}</span>
              </div>
              <div className="flex-grow min-w-0">
                <p className="font-body text-body-md text-on-surface truncate">{customer.name || 'Unnamed'}</p>
                <p className="font-body text-label-sm text-on-surface-variant">{customer.phone} · {customer.email || 'No email'}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-body text-label-sm text-on-surface-variant">Joined</p>
                <p className="font-body text-body-sm text-on-surface">{formatDate(customer.createdAt)}</p>
              </div>
              <Icon name="chevron_right" className="text-[18px] text-on-surface-variant flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </main>
  )
}
