import { Line } from '@react-three/drei'

export default function Edge({ sourceNode, targetNode }) {
  const points = [
    [sourceNode.x, sourceNode.y, sourceNode.z],
    [targetNode.x, targetNode.y, targetNode.z],
  ]

  return (
    <Line
      points={points}
      color="rgb(150,150,220)"
      lineWidth={1}
      transparent
      opacity={0.4}
    />
  )
}
