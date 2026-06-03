import { Fragment, type ReactNode } from 'react'

function renderInline(text: string, kp: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    const tok = m[0] ?? ''
    if (tok.startsWith('**')) {
      nodes.push(<strong key={kp + '-b' + i}>{tok.slice(2, -2)}</strong>)
    } else if (tok.startsWith('`')) {
      nodes.push(<code key={kp + '-c' + i} style={{ background: '#f1efe8', padding: '1px 5px', borderRadius: '5px', fontSize: '13px', fontFamily: 'ui-monospace, monospace' }}>{tok.slice(1, -1)}</code>)
    }
    last = regex.lastIndex
    i++
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

export default function Markdown({ text }: { text: string }) {
  const lines = (text || '').replace(/\r/g, '').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''
    const t = line.trim()

    if (t === '') { i++; continue }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
      blocks.push(<hr key={key++} style={{ border: 'none', borderTop: '1px solid #e8e6e0', margin: '12px 0' }} />)
      i++; continue
    }

    const h = t.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      const level = (h[1] ?? '#').length
      const size = level <= 1 ? 18 : level === 2 ? 16 : 15
      const k = key++
      blocks.push(
        <div key={k} style={{ fontWeight: 700, fontSize: size + 'px', color: '#1a1a1a', margin: blocks.length ? '14px 0 4px' : '0 0 4px' }}>
          {renderInline(h[2] ?? '', 'h' + k)}
        </div>
      )
      i++; continue
    }

    if (/^>\s?/.test(t)) {
      const quote: string[] = []
      while (i < lines.length && /^>\s?/.test((lines[i] ?? '').trim())) {
        quote.push((lines[i] ?? '').trim().replace(/^>\s?/, ''))
        i++
      }
      const k = key++
      blocks.push(
        <div key={k} style={{ borderLeft: '3px solid #d97706', background: '#fffbeb', padding: '8px 12px', borderRadius: '0 8px 8px 0', margin: '8px 0', fontSize: '13px', color: '#1a1a1a', lineHeight: 1.5 }}>
          {quote.map((q, qi) => <div key={qi}>{renderInline(q, 'q' + k + qi)}</div>)}
        </div>
      )
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: { depth: number; text: string }[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? '')) {
        const indent = ((lines[i] ?? '').match(/^(\s*)/)?.[1] ?? '').length
        items.push({ depth: Math.floor(indent / 2), text: (lines[i] ?? '').replace(/^\s*[-*]\s+/, '') })
        i++
      }
      const k = key++
      blocks.push(
        <ul key={k} style={{ margin: '4px 0', paddingLeft: '20px' }}>
          {items.map((it, ii) => (
            <li key={ii} style={{ marginLeft: it.depth * 16 + 'px', marginBottom: '3px', fontSize: '14px', lineHeight: 1.5 }}>
              {renderInline(it.text, 'li' + k + ii)}
            </li>
          ))}
        </ul>
      )
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\s*\d+\.\s+/, ''))
        i++
      }
      const k = key++
      blocks.push(
        <ol key={k} style={{ margin: '4px 0', paddingLeft: '22px' }}>
          {items.map((it, ii) => (
            <li key={ii} style={{ marginBottom: '3px', fontSize: '14px', lineHeight: 1.5 }}>{renderInline(it, 'ol' + k + ii)}</li>
          ))}
        </ol>
      )
      continue
    }

    const para: string[] = []
    while (i < lines.length) {
      const pl = lines[i] ?? ''
      const pt = pl.trim()
      if (pt === '') break
      if (/^(#{1,4})\s+/.test(pt)) break
      if (/^>\s?/.test(pt)) break
      if (/^\s*[-*]\s+/.test(pl)) break
      if (/^\s*\d+\.\s+/.test(pl)) break
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(pt)) break
      para.push(pl)
      i++
    }
    const k = key++
    blocks.push(
      <p key={k} style={{ margin: blocks.length ? '8px 0 0' : 0, fontSize: '14px', lineHeight: 1.5, color: '#1a1a1a' }}>
        {para.map((pl, pi) => (
          <Fragment key={pi}>
            {pi > 0 && <br />}
            {renderInline(pl, 'p' + k + pi)}
          </Fragment>
        ))}
      </p>
    )
  }

  return <div>{blocks}</div>
}
