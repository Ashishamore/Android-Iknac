import { MotionConfig } from 'motion/react'
import { useMemo, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { DEVICES, type DeviceSpec } from '@/app/config'
import { cn } from '@/lib/cn'
import { useMediaQuery } from '@/lib/hooks'
import { OverlayRootProvider } from '@/overlays/OverlayRoot'
import { usePrefs } from '@/store/prefs'
import { DeviceContext, useShellMode } from './device'
import { PresenterPanel } from './PresenterPanel'
import { GestureBar, StatusBar } from './StatusBar'

const PANEL_WIDTH = 360

const onResize = (cb: () => void) => {
  window.addEventListener('resize', cb)
  return () => window.removeEventListener('resize', cb)
}

/**
 * Decides how the app is presented:
 *  • phones / tablets → the app fills the screen, exactly like a native app
 *  • laptops / desktops → the app runs inside a device frame, scaled to fit
 *
 * The element tree is identical in both modes, so switching (e.g. resizing a
 * browser window) never remounts the app or loses its state.
 */
export function DeviceShell({ children }: { children: ReactNode }) {
  const mode = useShellMode()
  const frame = mode === 'frame'
  const spec = DEVICES[usePrefs((s) => s.device)]
  const docked = useMediaQuery('(min-width: 1180px)')
  const vw = useSyncExternalStore(onResize, () => window.innerWidth)
  const vh = useSyncExternalStore(onResize, () => window.innerHeight)

  const outerW = spec.width + spec.bezel * 2
  const outerH = spec.height + spec.bezel * 2
  const availW = vw - (docked ? PANEL_WIDTH : 0) - 64
  const availH = vh - (docked ? 56 : 128)
  const scale = frame ? Math.max(0.3, Math.min(1, availW / outerW, availH / outerH)) : 1

  const device = useMemo(() => ({ mode, device: frame ? spec : null, scale }), [mode, frame, spec, scale])
  // Drag gestures inside a scaled frame need pointer coordinates in local space.
  const transformPagePoint = useMemo(
    () => (p: { x: number; y: number }) => ({ x: p.x / scale, y: p.y / scale }),
    [scale],
  )

  const screenStyle = frame
    ? ({
        left: spec.bezel,
        top: spec.bezel,
        width: spec.width,
        height: spec.height,
        borderRadius: spec.radius - spec.bezel,
        '--sat': `${spec.statusBar}px`,
        '--sab': `${spec.gestureBar}px`,
      } as CSSProperties)
    : undefined

  return (
    <DeviceContext.Provider value={device}>
      <MotionConfig transformPagePoint={transformPagePoint} reducedMotion="user">
        <div className={cn('fixed inset-0', frame && 'flex overflow-hidden bg-bg')}>
          {frame && <Backdrop />}
          {frame && <PresenterPanel docked={docked} width={PANEL_WIDTH} />}
          <div className={frame ? 'relative grid min-w-0 flex-1 place-items-center' : 'contents'}>
            <div
              className={frame ? 'relative' : 'contents'}
              style={frame ? { width: outerW * scale, height: outerH * scale } : undefined}
            >
              <div
                className={frame ? 'absolute left-0 top-0 origin-top-left' : 'contents'}
                style={frame ? { width: outerW, height: outerH, transform: `scale(${scale})` } : undefined}
              >
                {frame && <DeviceBezel spec={spec} />}
                <div
                  className={cn(
                    'app-surface @container isolate overflow-clip bg-bg text-fg',
                    frame ? 'absolute' : 'absolute inset-0',
                  )}
                  style={screenStyle}
                >
                  <OverlayRootProvider>{children}</OverlayRootProvider>
                  {frame && <StatusBar spec={spec} />}
                  {frame && <GestureBar />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </MotionConfig>
    </DeviceContext.Provider>
  )
}

function DeviceBezel({ spec }: { spec: DeviceSpec }) {
  return (
    <>
      <div
        className="absolute inset-0 bg-[#0b0d12] shadow-[0_60px_120px_-40px_rgb(15_23_42/0.45),0_30px_60px_-30px_rgb(15_23_42/0.4),inset_0_0_0_1.5px_#303641,inset_0_0_0_4px_#0b0d12]"
        style={{ borderRadius: spec.radius }}
      />
      {spec.kind === 'phone' ? (
        <>
          <span className="absolute -right-[3px] top-[20%] h-16 w-[3px] rounded-r-sm bg-[#22262e]" />
          <span className="absolute -right-[3px] top-[31%] h-28 w-[3px] rounded-r-sm bg-[#22262e]" />
        </>
      ) : (
        <span className="absolute left-1/2 top-[6px] size-1.5 -translate-x-1/2 rounded-full bg-[#2a2f38]" />
      )}
    </>
  )
}

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, var(--color-line-strong) 1px, transparent 0)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse at 60% 50%, black 20%, transparent 75%)',
        }}
      />
      <div className="absolute -right-40 -top-40 size-[640px] rounded-full bg-brand-400/15 blur-3xl" />
      <div className="absolute -bottom-48 left-1/4 size-[560px] rounded-full bg-brand-300/10 blur-3xl" />
    </div>
  )
}
