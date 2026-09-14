import { useState } from 'react'
import { propById } from '@/data/props'
import { usePhotoPicker } from '../usePhotoPicker'
import { PhotoScanSheet } from './PhotoScanSheet'
import { VoiceSearchSheet } from './VoiceSearchSheet'

/** What a photo search found: the photo and the prop it matched. */
export interface PhotoResult {
  url: string | null
  matchId: string
}

/** The "sample photo" for demos without a camera: the yellow car from banner 1. */
const SAMPLE_PHOTO: PhotoResult = { url: '/samples/yellow-car.webp', matchId: 'classic-sedan' }
/** Uploaded photos "match" one of these (recognition is simulated). */
const PHOTO_MATCHES = ['chesterfield-sofa', 'rotary-phone', 'vintage-motorbike', 'crystal-chandelier', 'gramophone', 'wingback-armchair', 'brass-lantern', 'leather-trunk']
const VOICE_PHRASES = ['vintage rotary phone', 'chesterfield sofa', 'vanity van in Andheri', 'brass lantern', 'classic car']
let voiceTurn = 0

/**
 * Voice and photo search, shared by Discover, the search screen and results.
 * Render `element` somewhere in the screen; call startVoice / startPhoto from buttons.
 */
export function useSearchTools({ onVoice, onPhoto }: { onVoice: (text: string) => void; onPhoto: (result: PhotoResult) => void }) {
  const [voice, setVoice] = useState({ key: 0, open: false, phrase: VOICE_PHRASES[0] })
  const [scan, setScan] = useState({ key: 0, open: false, ...SAMPLE_PHOTO })

  const startVoice = () => {
    const phrase = VOICE_PHRASES[voiceTurn++ % VOICE_PHRASES.length]
    setVoice((v) => ({ key: v.key + 1, open: true, phrase }))
  }

  const beginScan = (result: PhotoResult) => setScan((s) => ({ key: s.key + 1, open: true, ...result }))

  const photos = usePhotoPicker({
    title: 'Search with a photo',
    description: 'Find props that look like your reference',
    sample: { url: SAMPLE_PHOTO.url!, label: 'A yellow vintage car' },
    onPick: ({ url, file }) =>
      beginScan(file ? { url, matchId: PHOTO_MATCHES[file.size % PHOTO_MATCHES.length] } : SAMPLE_PHOTO),
  })

  const element = (
    <>
      {photos.element}
      <VoiceSearchSheet
        key={`voice-${voice.key}`}
        open={voice.open}
        phrase={voice.phrase}
        onClose={() => setVoice((v) => ({ ...v, open: false }))}
        onResult={(text) => {
          setVoice((v) => ({ ...v, open: false }))
          onVoice(text)
        }}
      />
      <PhotoScanSheet
        key={`photo-${scan.key}`}
        open={scan.open}
        url={scan.url}
        match={propById(scan.matchId)}
        onClose={() => setScan((s) => ({ ...s, open: false }))}
        onDone={() => {
          setScan((s) => ({ ...s, open: false }))
          onPhoto({ url: scan.url, matchId: scan.matchId })
        }}
      />
    </>
  )

  return { startVoice, startPhoto: photos.pick, element }
}
