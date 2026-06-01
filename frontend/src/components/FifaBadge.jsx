import { getFifaRank, getRankColor } from '../utils/rankings'

export default function FifaBadge({ name, className = '' }) {
  const rank = getFifaRank(name)
  if (!rank) return null
  const color = getRankColor(rank)
  return (
    <span
      className={`inline-flex items-center text-[11px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${className}`}
      style={{ background: `${color}18`, color, border: `1px solid ${color}45` }}
    >
      FIFA {rank}위
    </span>
  )
}
