'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function Payments() {
  const [contracts, setContracts] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedContract, setSelectedContract] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [paidDate, setPaidDate] = useState('')
  const [status, setStatus] = useState('pending')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      loadData()
    }
    check()
  }, [])

  const loadData = async () => {
    const { data: contractsData } = await supabase
      .from('contracts')
      .select('*, tenants(full_name), units(name, properties(name))')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    setContracts(contractsData || [])

    const { data: paymentsData } = await supabase
      .from('payments')
      .select('*, contracts(tenant_id, tenants(full_name), units(name, properties(name)))')
      .order('due_date', { ascending: false })
    setPayments(paymentsData || [])
  }

  const handleAdd = async () => {
    if (!selectedContract || !amount || !dueDate) return
    setLoading(true)
    await supabase.from('payments').insert({
      contract_id: selectedContract,
      amount: parseFloat(amount),
      due_date: dueDate,
      paid_date: paidDate || null,
      status: paidDate ? 'paid' : status,
    })
    setSelectedContract(''); setAmount(''); setDueDate(''); setPaidDate(''); setStatus('pending')
    setShowForm(false)
    setLoading(false)
    loadData()
  }

  const handleMarkPaid = async (id: string) => {
    await supabase.from('payments').update({
      status: 'paid',
      paid_date: new Date().toISOString().split('T')[0],
    }).eq('id', id)
    loadData()
  }

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
  const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)
  const totalLate = payments.filter(p => p.status === 'late').reduce((sum, p) => sum + p.amount, 0)

  const statusStyle: any = {
    paid: 'bg-green-50 text-green-600',
    pending: 'bg-amber-50 text-amber-600',
    late: 'bg-red-50 text-red-600',
  }

  const statusLabel: any = {
    paid: 'Bezahlt',
    pending: 'Ausstehend',
    late: 'Überfällig',
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center">
        <div className="text-lg font-medium text-gray-900">MietNext</div>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-400 hover:text-gray-600">
          ← Dashboard
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-medium text-gray-900">Zahlungen</h1>
            <p className="text-sm text-gray-400 mt-1">{payments.length} Zahlungen gesamt</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600">
            + Zahlung erfassen
          </button>
        </div>

        {/* Übersicht */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="text-2xl font-medium text-green-600 mb-1">{totalPaid.toLocaleString('de-DE')} €</div>
            <div className="text-sm text-gray-400">Eingegangen</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="text-2xl font-medium text-amber-600 mb-1">{totalPending.toLocaleString('de-DE')} €</div>
            <div className="text-sm text-gray-400">Ausstehend</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="text-2xl font-medium text-red-600 mb-1">{totalLate.toLocaleString('de-DE')} €</div>
            <div className="text-sm text-gray-400">Überfällig</div>
          </div>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Zahlung erfassen</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Mietvertrag *</label>
                <select value={selectedContract} onChange={e => {
                  setSelectedContract(e.target.value)
                  const contract = contracts.find(c => c.id === e.target.value)
                  if (contract) setAmount(contract.rent_amount.toString())
                }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                  <option value="">Vertrag auswählen...</option>
                  {contracts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.tenants?.full_name} – {c.units?.properties?.name} – {c.rent_amount} €
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Betrag (€) *</label>
                <input value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="z.B. 950" type="number"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Fällig am *</label>
                <input value={dueDate} onChange={e => setDueDate(e.target.value)}
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Eingegangen am (leer = noch offen)</label>
                <input value={paidDate} onChange={e => setPaidDate(e.target.value)}
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                  <option value="pending">Ausstehend</option>
                  <option value="paid">Bezahlt</option>
                  <option value="late">Überfällig</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd}
                disabled={loading || !selectedContract || !amount || !dueDate}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-40">
                {loading ? 'Speichern...' : 'Speichern'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="border border-gray-200 text-gray-500 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {payments.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-sm">Noch keine Zahlungen erfasst.</p>
            <button onClick={() => setShowForm(true)}
              className="mt-3 text-blue-500 text-sm hover:underline">
              Erste Zahlung erfassen →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {payments.map(p => (
              <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-5 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {p.contracts?.tenants?.full_name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Fällig: {new Date(p.due_date).toLocaleDateString('de-DE')}
                    {p.paid_date && ` · Bezahlt: ${new Date(p.paid_date).toLocaleDateString('de-DE')}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900 text-sm">{p.amount.toLocaleString('de-DE')} €</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusStyle[p.status]}`}>
                    {statusLabel[p.status]}
                  </span>
                  {p.status !== 'paid' && (
                    <button onClick={() => handleMarkPaid(p.id)}
                      className="text-xs border border-green-200 text-green-600 px-3 py-1 rounded-lg hover:bg-green-50">
                      Als bezahlt markieren
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}