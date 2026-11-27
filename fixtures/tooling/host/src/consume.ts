// Typechecked against the types `mf dts` downloaded into ./@mf-types. This package installs
// neither react/@types/react nor zod: those types must come from the remote's archive, where
// @module-federation/third-party-dts-extractor put them. If they were missing, the types
// below would collapse to `any` and every @ts-expect-error would become an unused-directive error.
import type Button from 'remote/Button'
import type { ButtonProps } from 'remote/Button'
import type { User, parseUser } from 'remote/schema'

export const props: ButtonProps = { label: 'Buy' }
// @ts-expect-error label is a string
export const badProps: ButtonProps = { label: 1 }

export const user: User = { id: 1, name: 'Ada' }
// @ts-expect-error id is a number (z.infer, resolved from the extracted zod d.ts)
export const badUser: User = { id: '1', name: 'Ada' }

export const parsed: ReturnType<typeof parseUser> = user

type ButtonElement = ReturnType<typeof Button>
// @ts-expect-error JSX.Element (from the extracted @types/react) is not a number
export const notAnElement: ButtonElement = 42
