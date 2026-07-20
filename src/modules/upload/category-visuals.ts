import {
  Blocks,
  Box,
  Crosshair,
  Gamepad2,
  Gift,
  Globe,
  MessageCircle,
  Send,
  Shield,
  Smartphone,
  Target,
  type LucideIcon
} from 'lucide-react'
import { MARKET_CATEGORIES } from '@core/constants'

export interface CategoryVisual {
  id: string
  label: string
  icon: LucideIcon
  gradient: string
  accent: string
  logoUrl?: string
}

const ICON_BY_CATEGORY: Record<string, LucideIcon> = {
  steam: Gamepad2,
  discord: MessageCircle,
  telegram: Send,
  roblox: Box,
  fortnite: Crosshair,
  valorant: Target,
  minecraft: Blocks,
  gifts: Gift,
  vpn: Shield,
  tiktok: Smartphone,
  instagram: Smartphone,
  epicgames: Gamepad2,
  battlenet: Gamepad2,
  origin: Gamepad2,
  uplay: Gamepad2,
  warface: Target,
  'world-of-tanks': Target,
  'escape-from-tarkov': Target,
  'genshin-impact': Gamepad2,
  supercell: Smartphone,
  'wot-blitz': Target,
  hytale: Blocks,
  socialclub: Gamepad2,
  llm: Globe
}

const GRADIENT_BY_CATEGORY: Record<string, { gradient: string; accent: string }> = {
  steam: { gradient: 'linear-gradient(135deg, #1b2838 0%, #2a475e 100%)', accent: '#66c0f4' },
  discord: { gradient: 'linear-gradient(135deg, #5865F2 0%, #404eed 100%)', accent: '#5865F2' },
  telegram: { gradient: 'linear-gradient(135deg, #229ED9 0%, #0088cc 100%)', accent: '#229ED9' },
  roblox: { gradient: 'linear-gradient(135deg, #393b3d 0%, #E2231A 100%)', accent: '#E2231A' },
  fortnite: { gradient: 'linear-gradient(135deg, #2d1b4e 0%, #9d4dbb 100%)', accent: '#9d4dbb' },
  valorant: { gradient: 'linear-gradient(135deg, #1f1f1f 0%, #ff4655 100%)', accent: '#ff4655' },
  minecraft: { gradient: 'linear-gradient(135deg, #3d5c2e 0%, #62a745 100%)', accent: '#62a745' },
  gifts: { gradient: 'linear-gradient(135deg, #3d2a1f 0%, #e8a020 100%)', accent: '#e8a020' },
  vpn: { gradient: 'linear-gradient(135deg, #1a2a3a 0%, #00ba78 100%)', accent: '#00ba78' },
  tiktok: { gradient: 'linear-gradient(135deg, #121212 0%, #fe2c55 100%)', accent: '#fe2c55' },
  instagram: { gradient: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)', accent: '#e1306c' },
  epicgames: { gradient: 'linear-gradient(135deg, #1a1a1a 0%, #2f2f2f 100%)', accent: '#ffffff' },
  battlenet: { gradient: 'linear-gradient(135deg, #0e1621 0%, #148eff 100%)', accent: '#148eff' },
  origin: { gradient: 'linear-gradient(135deg, #1a1a1a 0%, #f56c2d 100%)', accent: '#f56c2d' },
  uplay: { gradient: 'linear-gradient(135deg, #0070ff 0%, #004bb5 100%)', accent: '#0070ff' },
  warface: { gradient: 'linear-gradient(135deg, #1a2332 0%, #f05a28 100%)', accent: '#f05a28' },
  llm: { gradient: 'linear-gradient(135deg, #1a1a2e 0%, #7c5cff 100%)', accent: '#7c5cff' },
  socialclub: { gradient: 'linear-gradient(135deg, #111 0%, #ffb400 100%)', accent: '#ffb400' },
  hytale: { gradient: 'linear-gradient(135deg, #2a4a6b 0%, #5eb3ff 100%)', accent: '#5eb3ff' },
  'world-of-tanks': { gradient: 'linear-gradient(135deg, #3a2f1f 0%, #c9a227 100%)', accent: '#c9a227' },
  supercell: { gradient: 'linear-gradient(135deg, #1a1a1a 0%, #3d8bfd 100%)', accent: '#3d8bfd' },
  'wot-blitz': { gradient: 'linear-gradient(135deg, #4a3a1a 0%, #e8b923 100%)', accent: '#e8b923' },
  'genshin-impact': { gradient: 'linear-gradient(135deg, #1a2744 0%, #4cc2ff 100%)', accent: '#4cc2ff' },
  'escape-from-tarkov': { gradient: 'linear-gradient(135deg, #1a1a1a 0%, #c4a35a 100%)', accent: '#c4a35a' }
}

const DEFAULT_VISUAL = {
  gradient: 'linear-gradient(135deg, #242424 0%, #363636 100%)',
  accent: '#00ba78'
}

const labelById = Object.fromEntries(MARKET_CATEGORIES.map((c) => [c.id, c.label]))

import steamLogo from '../../assets/categories/steam.svg'
import discordLogo from '../../assets/categories/discord.svg'
import telegramLogo from '../../assets/categories/telegram.svg'
import robloxLogo from '../../assets/categories/roblox.svg'
import fortniteLogo from '../../assets/categories/fortnite.svg'
import valorantLogo from '../../assets/categories/valorant.svg'
import tiktokLogo from '../../assets/categories/tiktok.svg'
import instagramLogo from '../../assets/categories/instagram.svg'
import epicgamesLogo from '../../assets/categories/epicgames.svg'
import battlenetLogo from '../../assets/categories/battlenet.svg'
import originLogo from '../../assets/categories/origin.svg'
import uplayLogo from '../../assets/categories/uplay.svg'

const LOGO_BY_CATEGORY: Record<string, string> = {
  steam: steamLogo,
  discord: discordLogo,
  telegram: telegramLogo,
  roblox: robloxLogo,
  fortnite: fortniteLogo,
  valorant: valorantLogo,
  tiktok: tiktokLogo,
  instagram: instagramLogo,
  epicgames: epicgamesLogo,
  battlenet: battlenetLogo,
  origin: originLogo,
  uplay: uplayLogo
}

export function getCategoryVisual(category?: string | null): CategoryVisual {
  const id = (category ?? '').toLowerCase().trim() || 'other'
  const colors = GRADIENT_BY_CATEGORY[id] ?? DEFAULT_VISUAL
  return {
    id,
    label: labelById[id] ?? (category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Other'),
    icon: ICON_BY_CATEGORY[id] ?? Box,
    logoUrl: LOGO_BY_CATEGORY[id],
    gradient: colors.gradient,
    accent: colors.accent
  }
}

export function categoryMarketUrl(categoryId: string): string {
  if (categoryId === 'other') return 'https://lzt.market/'
  return `https://lzt.market/${categoryId}/`
}
