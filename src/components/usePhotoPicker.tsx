import { CameraIcon, ImageSquareIcon, ImagesIcon } from '@phosphor-icons/react'
import { useLayoutEffect, useRef, type ChangeEvent } from 'react'
import { usePopup } from '@/overlays/popupContext'

export interface PickedPhoto {
  /** Object URL of the file, or the sample's path. */
  url: string
  /** The chosen file (null for the sample). */
  file: File | null
}

interface PhotoPickerOptions {
  title: string
  description?: string
  /** Adds "Try a sample photo" (handy on desktop demos). */
  sample?: { url: string; label: string }
  onPick: (photo: PickedPhoto) => void
}

/**
 * "Take a photo / Choose from gallery / Try a sample" action sheet with the
 * hidden file inputs it needs. Render `element` in the screen; call `pick()`
 * from a tap.
 */
export function usePhotoPicker({ title, description, sample, onPick }: PhotoPickerOptions) {
  const popup = usePopup()
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const pickRef = useRef(onPick)
  useLayoutEffect(() => {
    pickRef.current = onPick
  })

  const pick = async () => {
    const choice = await popup.actionSheet({
      title,
      description,
      options: [
        { id: 'camera', label: 'Take a photo', icon: CameraIcon },
        { id: 'gallery', label: 'Choose from gallery', icon: ImagesIcon },
        ...(sample ? [{ id: 'sample', label: 'Try a sample photo', description: sample.label, icon: ImageSquareIcon }] : []),
      ],
    })
    if (choice === 'camera') cameraRef.current?.click()
    else if (choice === 'gallery') galleryRef.current?.click()
    else if (choice === 'sample' && sample) pickRef.current({ url: sample.url, file: null })
  }

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) pickRef.current({ url: URL.createObjectURL(file), file })
  }

  const element = (
    <>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onFile} />
    </>
  )

  return { pick, element }
}
