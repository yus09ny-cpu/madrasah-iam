import { useState } from 'react'
import { isFiqhQuestion } from '@/lib/fiqhDetection'

// "Warn-first-still-allow" — bila teks dikesan sebagai soalan hukum hakam,
// TAHAN dulu (jangan hantar terus) dan biar UI papar amaran. Pengguna kekal
// kawal — boleh hantar juga (confirmSendAnyway) atau ubah semula (editInstead).
export function useFiqhGuard(onSend: (text: string) => void) {
  const [pendingText, setPendingText] = useState<string | null>(null)

  function guardedSend(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    if (isFiqhQuestion(trimmed)) {
      setPendingText(trimmed)
      return
    }
    onSend(trimmed)
  }

  function confirmSendAnyway() {
    if (pendingText) onSend(pendingText)
    setPendingText(null)
  }

  function editInstead() {
    setPendingText(null)
  }

  return { guardedSend, isPending: pendingText !== null, confirmSendAnyway, editInstead }
}
