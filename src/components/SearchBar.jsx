import { useRef } from 'react'
import useGraphStore from '../store/useGraphStore'

export default function SearchBar() {
  const inputRef     = useRef()
  const searchQuery  = useGraphStore((s) => s.searchQuery)
  const setSearchQuery = useGraphStore((s) => s.setSearchQuery)
  const selectNode   = useGraphStore((s) => s.selectNode)
  const nodes        = useGraphStore((s) => s.nodes)

  const results = searchQuery
    ? nodes.filter((n) => n.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  function handleSelect(id) {
    selectNode(id)
    setSearchQuery('')
    inputRef.current?.blur()
  }

  return (
    <div style={styles.wrapper}>
      <input
        ref={inputRef}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search nodes…"
        style={styles.input}
      />
      {results.length > 0 && (
        <ul style={styles.dropdown}>
          {results.map((node) => (
            <li
              key={node.id}
              style={styles.item}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(108,99,255,0.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              onClick={() => handleSelect(node.id)}
            >
              <span style={styles.label}>{node.label}</span>
              <span style={{ ...styles.category, color: categoryColor(node.category) }}>
                {node.category}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function categoryColor(cat) {
  const map = { concept: '#6c63ff', person: '#ff6584', place: '#43d9ad', event: '#ffb347' }
  return map[cat] ?? '#aaaacc'
}

const styles = {
  wrapper: {
    position: 'fixed',
    top: 16,
    left: 16,
    zIndex: 100,
    // Cap to the viewport on small screens so the box never runs off-edge.
    width: 'min(240px, calc(100vw - 32px))',
    maxWidth: 'calc(100vw - 32px)',
    fontFamily: 'system-ui, sans-serif',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    background: 'rgba(10,10,20,0.75)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#fff',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  },
  dropdown: {
    marginTop: 4,
    listStyle: 'none',
    padding: '4px 0',
    background: 'rgba(10,10,20,0.85)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    maxHeight: '50vh',
    overflowY: 'auto',
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '7px 12px',
    cursor: 'pointer',
    transition: 'background 0.15s',
    background: 'transparent',
  },
  label: {
    color: '#fff',
    fontSize: 13,
  },
  category: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
}
