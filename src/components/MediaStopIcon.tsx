interface MediaStopIconProps {
  size?: number
}

export function MediaStopIcon({ size = 14 }: MediaStopIconProps): React.ReactNode {
  const inner = Math.max(8, Math.round(size * 0.72))
  const offset = (16 - inner) / 2

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden
      className="media-stop-icon"
    >
      <rect x={offset} y={offset} width={inner} height={inner} rx="2.25" fill="currentColor" />
    </svg>
  )
}
