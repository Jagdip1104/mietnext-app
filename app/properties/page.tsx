'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

interface DeleteInfo {
  propertyId: string
  unitsCount: number
  tenantsCount: number
  contractsCount: number
  paidPaymentsCount: number
}

export default function Properties() {
  const [properties, setProperties] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [zip, setZip] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteInfo, setDeleteInfo] = useState<DeleteInfo | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)
      loadProperties(session.user.id)
    }
    check()
  }, [])

  const loadProperties = async (uid: string) => {
    const { data } = await supabase
      .from('properties').select('*, units(count)')
      .eq('owner_id', uid)
      .order('created_at', { ascending: false })
    setProperties(data || [])
  }

  const handleEdit = (p: any) => {
    setEditingId(p.id); setName(p.name)
    setAddress(p.address || ''); setCity(p.city || ''); setZip(p.zip || '')
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false); setEditingId(null)
    setName(''); setAddress(''); setCity(''); setZip('')
  }

  const handleSave = async () => {
    if (!name) return
    setLoading(true)
    if (editingId) {
      await supabase.from('properties').update({ name, address, city, zip }).eq('id', editingId)
    } else {
      await supabase.from('properties').insert({ name, address, city, zip, owner_id: userId })
    }
    handleCancel(); setLoading(false); loadProperties(userId!)
  }

  // Vor dem Löschen: alle abhängigen Daten zählen
  const handleDeleteClick = async (propertyId: string) => {
    // Einheiten zählen
    const { data: units } = await supabase
      .from('units').select('id').eq('property_id', propertyId)
    const unitIds = (units || []).map((u: any) => u.id)

    let tenantsCount = 0
    let contractsCount = 0
    let paidPaymentsCount = 0

    if (unitIds.length > 0) {
      // Mieter zählen
      const { count: tCount } = await supabase
        .from('tenants').select('*', { count: 'exact', head: true })
        .in('unit_id', unitIds)
      tenantsCount = tCount || 0

      // Verträge zählen
      const { data: contracts } = await supabase
        .from('contracts').select('id').in('unit_id', unitIds)
      const contractIds = (contracts || []).map((c: any) => c.id)
      contractsCount = contractIds.length

      // Bezahlte Zahlungen zählen
      if (contractIds.length > 0) {
        const { count: pCount } = await supabase
          .from('payments').select('*', { count: 'exact', head: true })
          .in('contract_id', contractIds).eq('status', 'paid')
        paidPaymentsCount = pCount || 0
      }
    }

    setDeleteInfo({
      propertyId,
      unitsCount: unitIds.length,
      tenantsCount,
      contractsCount,
      paidPaymentsCount
    })
  }

  // Eigentlicher Delete mit manuellem Cascade
  const handleConfirmDelete = async () => {
    if (!deleteInfo) return
    if (deleteInfo.paidPaymentsCount > 0) return

    setDeleting(true)

    try {
      // 1. Einheiten der Property finden
      const { data: units } = await supabase
        .from('units').select('id').eq('property_id', deleteInfo.propertyId)
      const unitIds = (units || []).map((u: any) => u.id)

      if (unitIds.length > 0) {
        // 2. Verträge + Zahlungen löschen
        const { data: contracts } = await supabase
          .from('contracts').select('id').in('unit_id', unitIds)
        const contractIds = (contracts || []).map((c: any) => c.id)

        if (contractIds.length > 0) {
          await supabase.from('payments').delete().in('contract_id', contractIds)
          await supabase.from('contracts').delete().in('id', contractIds)
        }

        // 3. Mieter aus den Einheiten löschen
        await supabase.from('tenants').delete().in('unit_id', unitIds)
      }

      // 4. Property löschen (Einheiten cascaden automatisch)
      const { error } = await supabase.from('properties').delete().eq('id', deleteInfo.propertyId)
      if (error) throw error

      setDeleteInfo(null)
      loadProperties(userId!)
    } catch (err: any) {
      alert('Fehler beim Löschen: ' + err.message)
    }

    setDeleting(false)
  }

  const card = { backgroundColor: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '24px' }
  const input = { width: '100%', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', color: '#1a1a1a', backgroundColor: '#fff' }
  const label = { fontSize: '12px', color: '#999', marginBottom: '6px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }

  return (
    <main style={{ backgroundColor: '#fafaf8', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
              Objekte
            </h1>
            <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>{properties.length} Objekte gesamt</p>
          </div>
          <button onClick={() => setShowForm(true)} style={{
            backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px',
            borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer',
          }}>
            + Objekt anlegen
          </button>
        </div>

        {/* Lösch-Dialog */}
        {deleteInfo && (
          <div style={{
            ...card,
            marginBottom: '24px',
            borderLeft: deleteInfo.paidPaymentsCount > 0 ? '4px solid #dc2626' : '4px solid #d97706'
          }}>
            {deleteInfo.paidPaymentsCount > 0 ? (
              <>
                <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#dc2626', margin: '0 0 12px', fontFamily: 'Georgia, serif' }}>
                  ⛔ Löschen nicht möglich
                </h2>
                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 8px' }}>
                  Dieses Objekt hat <strong>{deleteInfo.paidPaymentsCount} bereits bezahlte Zahlung(en)</strong>.
                </p>
                <p style={{ fontSize: '13px', color: '#999', margin: '0 0 16px' }}>
                  Aus Buchhaltungsgründen (10-Jahre-Aufbewahrung nach §147 AO) kann das Objekt nicht gelöscht werden.
                </p>
                <button onClick={() => setDeleteInfo(null)} style={{
                  backgroundColor: '#fff', color: '#666', padding: '10px 20px',
                  borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer'
                }}>
                  Verstanden
                </button>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#d97706', margin: '0 0 12px', fontFamily: 'Georgia, serif' }}>
                  ⚠️ Objekt wirklich löschen?
                </h2>
                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 8px' }}>
                  Folgende Daten werden <strong>unwiderruflich</strong> mitgelöscht:
                </p>
                <ul style={{ fontSize: '14px', color: '#1a1a1a', margin: '0 0 16px', paddingLeft: '20px' }}>
                  <li>{deleteInfo.unitsCount} Einheit(en)</li>
                  <li>{deleteInfo.tenantsCount} Mieter</li>
                  <li>{deleteInfo.contractsCount} Vertrag/Verträge</li>
                </ul>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleConfirmDelete} disabled={deleting} style={{
                    backgroundColor: '#dc2626', color: '#fff', padding: '10px 20px',
                    borderRadius: '8px', border: 'none', fontSize: '13px',
                    cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.5 : 1
                  }}>
                    {deleting ? 'Lösche...' : 'Ja, alles löschen'}
                  </button>
                  <button onClick={() => setDeleteInfo(null)} disabled={deleting} style={{
                    backgroundColor: '#fff', color: '#666', padding: '10px 20px',
                    borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer'
                  }}>
                    Abbrechen
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {showForm && (
          <div style={{ ...card, marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>
              {editingId ? 'Objekt bearbeiten' : 'Neues Objekt'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={label}>Name *</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="z.B. Mehrfamilienhaus Musterstraße" style={input} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={label}>Adresse</label>
                <input value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="Musterstraße 1" style={input} />
              </div>
              <div>
                <label style={label}>PLZ</label>
                <input value={zip} onChange={e => setZip(e.target.value)}
                  placeholder="12345" style={input} />
              </div>
              <div>
                <label style={label}>Stadt</label>
                <input value={city} onChange={e => setCity(e.target.value)}
                  placeholder="Berlin" style={input} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSave} disabled={loading || !name} style={{
                backgroundColor: '#1a1a1a', color: '#fff', padding: '10px 20px',
                borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer', opacity: loading || !name ? 0.4 : 1,
              }}>
                {loading ? 'Speichern...' : editingId ? 'Änderungen speichern' : 'Speichern'}
              </button>
              <button onClick={handleCancel} style={{
                backgroundColor: '#fff', color: '#666', padding: '10px 20px',
                borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer',
              }}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {properties.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '64px' }}>
            <p style={{ fontSize: '14px', color: '#bbb', margin: '0 0 12px' }}>Noch keine Objekte angelegt.</p>
            <button onClick={() => setShowForm(true)} style={{
              background: 'none', border: 'none', color: '#1a1a1a',
              fontSize: '14px', cursor: 'pointer', textDecoration: 'underline',
            }}>
              Erstes Objekt anlegen →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {properties.map((p: any) => (
              <div key={p.id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', margin: '0 0 4px' }}>{p.name}</p>
                    <p style={{ fontSize: '13px', color: '#bbb', margin: 0 }}>
                      {[p.address, p.zip, p.city].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#999', backgroundColor: '#f5f4f0', padding: '4px 12px', borderRadius: '20px' }}>
                      {p.units?.[0]?.count || 0} Einheiten
                    </span>
                    <button onClick={() => handleEdit(p)} style={{
                      backgroundColor: '#fff', color: '#666', padding: '8px 14px',
                      borderRadius: '8px', border: '1px solid #e8e6e0', fontSize: '13px', cursor: 'pointer',
                    }}>Bearbeiten</button>
                    <button onClick={() => handleDeleteClick(p.id)} style={{
                      backgroundColor: '#fff', color: '#dc2626', padding: '8px 14px',
                      borderRadius: '8px', border: '1px solid #fecaca', fontSize: '13px', cursor: 'pointer',
                    }}>Löschen</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}