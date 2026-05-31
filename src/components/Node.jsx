import { Html } from '@react-three/drei'
import useGraphStore from '../store/useGraphStore'

function getInitials(name) {
  const parts = (name ?? '').trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function splitName(name) {
  const parts = (name ?? '').trim().split(/\s+/)
  return [parts[0] ?? '', parts.slice(1).join(' ')]
}

export default function Node({ node }) {
  const selectedNodeId    = useGraphStore((s) => s.selectedNodeId)
  const connectMode       = useGraphStore((s) => s.connectMode)
  const pendingConnectId  = useGraphStore((s) => s.pendingConnectId)
  const selectNode        = useGraphStore((s) => s.selectNode)
  const addEdge           = useGraphStore((s) => s.addEdge)
  const setPendingConnect = useGraphStore((s) => s.setPendingConnect)
  const isDark            = useGraphStore((s) => s.isDark)
  const pathMode          = useGraphStore((s) => s.pathMode)
  const pathSource        = useGraphStore((s) => s.pathSource)
  const pathTarget        = useGraphStore((s) => s.pathTarget)
  const pathResults       = useGraphStore((s) => s.pathResults)
  const setPathNode       = useGraphStore((s) => s.setPathNode)

  const isSelected   = node.id === selectedNodeId
  const isPathSource = node.id === pathSource
  const isPathTarget = node.id === pathTarget
  const isOnPath     = pathResults.length > 0 && pathResults.some((p) => p.includes(node.id))
  const label      = node.label ?? node.fullName ?? '?'
  const [firstName, lastName] = splitName(label)

  // avatar gradient
  let avatarFrom = '#C4A882', avatarTo = '#9A7B5A'
  if (node.isSelf)                         { avatarFrom = '#EA580C'; avatarTo = '#C2410C' }
  else if (node.isDeceased)                { avatarFrom = '#94A3B8'; avatarTo = '#64748B' }
  else if (node.nodeState === 'claimed')   { avatarFrom = '#C2410C'; avatarTo = '#9A3412' }
  else if (node.nodeState === 'proxy')     { avatarFrom = '#D97706'; avatarTo = '#B45309' }
  else if (node.nodeState === 'invited')   { avatarFrom = '#D97706'; avatarTo = '#B45309' }

  // theme colours
  const cardBg    = isDark ? '#1A1612' : '#F5F0EB'
  const photoBg   = isDark ? '#2A1F16' : '#EDE3D8'
  const stripBg   = isDark ? '#141210' : '#FFFFFF'
  const textColor = isDark ? '#EDE8E3' : '#1A0A00'
  const subColor  = isDark ? 'rgba(237,232,227,0.50)' : 'rgba(26,10,0,0.45)'
  const relColor  = isDark ? '#8A7060' : '#D97706'

  const borderBase  = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.10)'
  let cardBorder = borderBase
  if (isPathSource)        cardBorder = '2px solid #22C55E'
  else if (isPathTarget)   cardBorder = '2px solid #3B82F6'
  else if (isSelected || node.isSelf) cardBorder = '2px solid #EA580C'

  let cardShadow = isDark ? '0 6px 28px rgba(0,0,0,0.70)' : '0 4px 16px rgba(0,0,0,0.14)'
  if (isPathSource)      cardShadow = '0 0 0 2.5px #22C55E, 0 8px 24px rgba(34,197,94,0.35)'
  else if (isPathTarget) cardShadow = '0 0 0 2.5px #3B82F6, 0 8px 24px rgba(59,130,246,0.35)'
  else if (isSelected)   cardShadow = '0 0 0 2.5px #EA580C, 0 8px 32px rgba(234,88,12,0.30)'
  else if (isOnPath)     cardShadow = '0 0 0 1.5px rgba(234,88,12,0.40), 0 4px 16px rgba(234,88,12,0.20)'

  function handleClick(e) {
    e.stopPropagation()
    if (pathMode) {
      setPathNode(node.id)
      return
    }
    if (!connectMode) {
      selectNode(node.id)
    } else if (pendingConnectId === null) {
      setPendingConnect(node.id)
    } else if (pendingConnectId !== node.id) {
      addEdge(pendingConnectId, node.id)
      setPendingConnect(null)
    }
  }

  return (
    <group position={[node.x, node.y, node.z]}>
      <Html
        center
        occlude={false}
        distanceFactor={320}
        zIndexRange={[0, 100]}
        style={{ pointerEvents: 'auto' }}
      >
        <div
          onClick={handleClick}
          onMouseEnter={() => { document.body.style.cursor = 'pointer' }}
          onMouseLeave={() => { document.body.style.cursor = 'default' }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            cursor: 'pointer', userSelect: 'none',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* YOU badge */}
          {node.isSelf && (
            <div style={{
              background: '#EA580C', color: '#fff',
              fontSize: '7px', fontWeight: 700, letterSpacing: '0.12em',
              padding: '2px 8px', marginBottom: 5,
              textTransform: 'uppercase',
            }}>
              YOU
            </div>
          )}

          {/* Polaroid card */}
          <div style={{
            width: 90, height: 115,
            background: cardBg,
            border: cardBorder,
            boxShadow: cardShadow,
            borderRadius: 3,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Photo / avatar area */}
            <div style={{
              flex: 1, background: photoBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', position: 'relative',
            }}>
              {node.photoUrl ? (
                <img src={node.photoUrl} alt={label}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  backgroundImage: `linear-gradient(135deg, ${avatarFrom}, ${avatarTo})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 16, fontWeight: 500, letterSpacing: '0.02em',
                }}>
                  {getInitials(label)}
                </div>
              )}
              {node.isDeceased && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.22)',
                }} />
              )}
            </div>

            {/* Name strip */}
            <div style={{
              height: 36, background: stripBg, flexShrink: 0,
              borderTop: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.06)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '0 4px', gap: 1,
            }}>
              <div style={{
                fontSize: 7.5, fontWeight: 600, letterSpacing: '0.10em',
                textTransform: 'uppercase', color: textColor, textAlign: 'center',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 82,
              }}>
                {firstName}
              </div>
              {lastName && (
                <div style={{
                  fontSize: 6.5, fontWeight: 400, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: subColor, textAlign: 'center',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 82,
                }}>
                  {lastName}
                </div>
              )}
            </div>
          </div>

          {/* Relationship label */}
          {node.relationshipToSelf && !node.isSelf && (
            <div style={{
              fontSize: 7.5, letterSpacing: '0.06em',
              color: relColor, fontStyle: 'italic',
              textAlign: 'center', marginTop: 6,
              textTransform: 'uppercase',
            }}>
              {node.relationshipToSelf}
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}
