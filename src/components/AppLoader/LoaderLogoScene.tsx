import type { ReactNode } from 'react'

const ARC_PATH =
  'M70.1504 207.392C91.8146 224.992 116.842 235.022 143.533 235.022C183.225 235.022 219.257 212.775 245.995 176.542C234.706 161.247 221.764 148.436 207.575 138.751L184.794 150.124C189.69 157.741 192.542 166.809 192.542 176.542C192.542 203.577 170.604 225.491 143.533 225.491C122.499 225.491 104.566 212.252 97.6139 193.666L70.1504 207.38V207.392ZM126.67 179.168C127.216 182.721 128.88 186.025 131.459 188.604C134.656 191.8 139.005 193.595 143.533 193.583C152.957 193.583 160.598 185.953 160.598 176.542C160.598 171.919 158.756 167.724 155.761 164.646L126.682 179.168H126.67Z'

const BOLT_PATH =
  'M76.3528 176.16L242.405 96.3367L205.91 20.4229L187.062 87.507L164.412 40.3758L145.552 107.46L122.902 60.3287L104.042 127.413L81.3916 80.2816L62.5319 147.366L39.8814 100.235L9.4707 208.318L50.9809 188.365L76.3528 176.172V176.16Z'

const LAND_FLASHES = [
  { left: 67, top: 141, t: '0.81s' },
  { left: 110, top: 135, t: '1.06s' },
  { left: 154, top: 118, t: '1.31s' },
  { left: 25, top: 105, t: '1.56s' },
  { left: 64, top: 83, t: '1.81s' },
  { left: 108, top: 53, t: '2.06s' },
  { left: 151, top: 42, t: '2.31s' }
] as const

export function LoaderLogoScene(): ReactNode {
  return (
    <div className="scene">
      <div className="scene-glow" aria-hidden="true" />
      <div className="scene-frame" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="orbit orbit-a" />
      <div className="orbit orbit-b" />
      <div className="ripple ripple-1" />
      <div className="ripple ripple-2" />

      <div className="sparks" aria-hidden="true">
        <span className="spark spark-1" />
        <span className="spark spark-2" />
        <span className="spark spark-3" />
        <span className="spark spark-4" />
        <span className="spark spark-5" />
        <span className="spark spark-6" />
      </div>

      <div className="logo-wrap">
        <div className="logo-shine" />
        <div className="logo-glow" />
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" aria-label="LZT">
          <defs>
            <clipPath id="loader-cut-b1">
              <rect x="-10" y="0" width="74" height="256" />
            </clipPath>
            <clipPath id="loader-cut-b2">
              <rect x="62" y="0" width="62" height="256" />
            </clipPath>
            <clipPath id="loader-cut-b3">
              <rect x="122" y="0" width="67" height="256" />
            </clipPath>
            <clipPath id="loader-cut-b4">
              <rect x="187" y="0" width="79" height="256" />
            </clipPath>
            <clipPath id="loader-cut-a1">
              <rect x="-10" y="0" width="137" height="256" />
            </clipPath>
            <clipPath id="loader-cut-a2">
              <rect x="125" y="0" width="69" height="256" />
            </clipPath>
            <clipPath id="loader-cut-a3">
              <rect x="192" y="0" width="74" height="256" />
            </clipPath>
          </defs>

          <g className="piece piece-a1" clipPath="url(#loader-cut-a1)">
            <path fill="#2BAD72" fillRule="evenodd" clipRule="evenodd" d={ARC_PATH} />
          </g>
          <g className="piece piece-a2" clipPath="url(#loader-cut-a2)">
            <path fill="#2BAD72" fillRule="evenodd" clipRule="evenodd" d={ARC_PATH} />
          </g>
          <g className="piece piece-a3" clipPath="url(#loader-cut-a3)">
            <path fill="#2BAD72" fillRule="evenodd" clipRule="evenodd" d={ARC_PATH} />
          </g>
          <g className="piece piece-b1" clipPath="url(#loader-cut-b1)">
            <path fill="#2BAD72" d={BOLT_PATH} />
          </g>
          <g className="piece piece-b2" clipPath="url(#loader-cut-b2)">
            <path fill="#2BAD72" d={BOLT_PATH} />
          </g>
          <g className="piece piece-b3" clipPath="url(#loader-cut-b3)">
            <path fill="#2BAD72" d={BOLT_PATH} />
          </g>
          <g className="piece piece-b4" clipPath="url(#loader-cut-b4)">
            <path fill="#2BAD72" d={BOLT_PATH} />
          </g>
        </svg>

        {LAND_FLASHES.map((flash) => (
          <span
            key={`${flash.left}-${flash.top}`}
            className="land-flash"
            style={{ left: `${flash.left}px`, top: `${flash.top}px`, ['--t' as string]: flash.t }}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  )
}
