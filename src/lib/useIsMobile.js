import { useState, useEffect } from 'react'

// ── useIsMobile ───────────────────────────────────────────────────────────────
// Shared viewport-width hook. All overlay UI is styled inline, so we detect the
// viewport with a tiny resize listener and branch layout on `isMobile`.
export default function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth <= breakpoint
  )
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])
  return isMobile
}
