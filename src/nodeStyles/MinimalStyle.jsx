// ── MinimalStyle.jsx ──────────────────────────────────────────────────────────
// Minimal node style: colored circle with initials + name label below.

function getInitials(name) {
  const parts = (name ?? '').trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function splitName(name) {
  const parts = (name ?? '').trim().split(/\s+/)
  return [parts[0] ?? '', parts.slice(1).join(' ')]
}

export default function MinimalStyle({
  node,
  isSelected,
  isPathSource,
  isPathTarget,
  isOnPath,
  isDark,
  onClick,
}) {
  const label = node.label ?? node.fullName ?? '?'
  const [firstName, lastName] = splitName(label)

  // Determine border/ring color for selection states
  let ringColor = 'transparent'
  if (isPathSource)                     ringColor = '#22C55E'
  else if (isPathTarget)                ringColor = '#3B82F6'
  else if (isSelected || node.isSelf)   ringColor = '#EA580C'
  else if (isOnPath)                    ringColor = 'rgba(234,88,12,0.50)'

  const textColor = isDark ? 'rgba(237,232,227,0.85)' : 'rgba(26,10,0,0.75)'
  const subColor  = isDark ? 'rgba(237,232,227,0.45)' : 'rgba(26,10,0,0.40)'
  const relColor  = isDark ? '#8A7060' : '#D97706'

  const boxShadow = isPathSource
    ? '0 0 0 2.5px #22C55E, 0 4px 14px rgba(34,197,94,0.30)'
    : isPathTarget
      ? '0 0 0 2.5px #3B82F6, 0 4px 14px rgba(59,130,246,0.30)'
      : isSelected
        ? '0 0 0 2.5px #EA580C, 0 4px 14px rgba(234,88,12,0.28)'
        : isOnPath
          ? '0 0 0 1.5px rgba(234,88,12,0.40)'
          : isDark
            ? '0 2px 10px rgba(0,0,0,0.50)'
            : '0 2px 8px rgba(0,0,0,0.16)'

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => { document.body.style.cursor = 'pointer' }}
      onMouseLeave={() => { document.body.style.cursor = 'default' }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        cursor: 'pointer', userSelect: 'none',
        fontFamily: 'system-ui, sans-serif',
        gap: 5,
      }}
    >
      {/* YOU badge */}
      {node.isSelf && (
        <div style={{
          background: '#EA580C', color: '#fff',
          fontSize: '7px', fontWeight: 700, letterSpacing: '0.12em',
          padding: '2px 8px',
          textTransform: 'uppercase',
        }}>
          YOU
        </div>
      )}

      {/* Circle with initials */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: node.color ?? '#aaaacc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 15, fontWeight: 600, letterSpacing: '0.02em',
        border: `2px solid ${ringColor}`,
        boxShadow,
        position: 'relative',
        flexShrink: 0,
      }}>
        {getInitials(label)}
        {/* Deceased overlay */}
        {node.isDeceased && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: isDark ? 'rgba(0,0,0,0.32)' : 'rgba(255,255,255,0.20)',
          }} />
        )}
      </div>

      {/* Name label */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <div style={{
          fontSize: 8, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: textColor, textAlign: 'center',
          whiteSpace: 'nowrap', maxWidth: 70,
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {firstName}
        </div>
        {lastName && (
          <div style={{
            fontSize: 7, fontWeight: 400, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: subColor, textAlign: 'center',
            whiteSpace: 'nowrap', maxWidth: 70,
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {lastName}
          </div>
        )}
      </div>

      {/* Relationship label */}
      {node.relationshipToSelf && !node.isSelf && (
        <div style={{
          fontSize: 7.5, letterSpacing: '0.06em',
          color: relColor, fontStyle: 'italic',
          textAlign: 'center',
          textTransform: 'uppercase',
        }}>
          {node.relationshipToSelf}
        </div>
      )}
    </div>
  )
}
