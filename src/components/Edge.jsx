import useGraphStore from '../store/useGraphStore'
import { getEdgeStyle } from '../edgeStyles'

export default function Edge({ edge, sourceNode, targetNode }) {
  const currentEdgeStyle = useGraphStore((s) => s.currentEdgeStyle)
  const StyleComponent   = getEdgeStyle(currentEdgeStyle)
  return <StyleComponent edge={edge} sourceNode={sourceNode} targetNode={targetNode} />
}
