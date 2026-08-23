'use client'

import { GooeyToaster as BaseGooeyToaster, type GooeyToastOptions } from 'goey-toast'
import 'goey-toast/styles.css'
import type { ReactNode } from 'react'
import { dedupToast } from './dedup-toast'

// Export dedupToast as toast so all imports get deduplication by default
export { dedupToast as toast }
export type { GooeyToastOptions }

export function GooeyToaster(props: {
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  theme?: 'light' | 'dark'
  duration?: number
  gap?: number
  offset?: string | number
  spring?: boolean
  bounce?: number
  closeOnEscape?: boolean
  showProgress?: boolean
  maxQueue?: number
  swipeToDismiss?: boolean
}) {
  return <BaseGooeyToaster position={props.position || 'top-center'} {...props} />
}

export function Toaster(props: { children?: ReactNode } & Omit<Parameters<typeof GooeyToaster>[0], 'children'>) {
  return (
    <>
      <GooeyToaster {...props} />
      {props.children}
    </>
  )
}
