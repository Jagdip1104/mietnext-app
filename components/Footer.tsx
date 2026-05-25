'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-[#e8e6e0] bg-[#fafaf8] flex justify-center gap-6 flex-wrap px-8 pt-5 pb-20 md:pb-5">
      <span className="text-[12px] text-[#999]">
        © {new Date().getFullYear()} MietNext
      </span>
      <Link href="/impressum" className="text-[12px] text-[#888] hover:text-[#1a1a1a] transition-colors no-underline">
        Impressum
      </Link>
      <Link href="/datenschutz" className="text-[12px] text-[#888] hover:text-[#1a1a1a] transition-colors no-underline">
        Datenschutz
      </Link>
    </footer>
  )
}
