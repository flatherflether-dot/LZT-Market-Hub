interface MediaPlayIconProps {
  size?: number
}

export function MediaPlayIcon({ size = 14 }: MediaPlayIconProps): React.ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden
      className="media-play-icon"
    >
      <path
        d="M6.35 4.72c0-.55.6-.89 1.07-.59l5.14 2.93c.5.29.5 1.02 0 1.31l-5.14 2.93c-.47.27-1.07-.05-1.07-.6V4.72z"
        fill="currentColor"
      />
    </svg>
  )
}
