interface ProgressRingProps {
  progress: number
  size?: number
  strokeWidth?: number
  label?: string
  sublabel?: string
}

export default function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 6,
  label,
  sublabel,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="#1e2d40"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="#c9a96e"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      {(label || sublabel) && (
        <div className="absolute text-center">
          {label && <p className="text-[#c9a96e] font-semibold text-lg leading-none">{label}</p>}
          {sublabel && <p className="text-[#8a7a65] text-xs mt-0.5">{sublabel}</p>}
        </div>
      )}
    </div>
  )
}
