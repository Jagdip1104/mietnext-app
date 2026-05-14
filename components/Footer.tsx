'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid #e8e6e0',
      padding: '20px 32px',
      backgroundColor: '#fafaf8',
      display: 'flex',
      justifyContent: 'center',
      gap: '24px',
      flexWrap: 'wrap' as const,
    }}>
      <span style={{ fontSize: '12px', color: '#999' }}>
        © {new Date().getFullYear()} MietNext
      </span>
      <Link href="/impressum" style={{ fontSize: '12px', color: '#888', textDecoration: 'none' }}>
        Impressum
      </Link>
      <Link href="/datenschutz" style={{ fontSize: '12px', color: '#888', textDecoration: 'none' }}>
        Datenschutz
      </Link>
    </footer>
  )
}