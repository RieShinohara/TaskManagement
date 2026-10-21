import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import type { Background, UserImageSlot } from '../api/types'
import { usePopover } from '../hooks/usePopover'
import { BACKGROUND_OPTIONS, isUserImageSlot } from '../lib/background'
import { wrapTabFocus } from '../lib/focusTrap'
import { ConfirmDialog } from './ConfirmDialog'

type Props = {
  value: Background | null // いまの背景。まだ分からないときは null
  onSelect: (background: Background) => void
  imageUrls: Partial<Record<UserImageSlot, string>> // 登録済みの自分の画像の URL
  // 画像を登録する。失敗したら、画面に出せる文の Error を投げる（登録できたら、その背景に切り替わる）
  onRegisterImage: (slot: UserImageSlot, file: File) => Promise<void>
  // 登録した画像を消す（標準の画像に戻る）
  onRemoveImage: (slot: UserImageSlot) => Promise<void>
}

const SMALL_BUTTON =
  'flex-none rounded-md border border-[#d5dbe8] bg-white px-2 py-1 text-sm whitespace-nowrap hover:bg-[#f1f4fa]'

// ヘッダーの「背景」ボタン。押すと、すぐ下に、見本つきの選択肢が開く。
// 選ぶと、すぐに切り替わって閉じる。窓の外・Esc では、何も選ばずに閉じる。
// 青空・夕焼け・星空の行には、「画像を選ぶ」（自分の画像を登録）と、登録済みなら「元に戻す」がある
export function BackgroundPicker({ value, onSelect, imageUrls, onRegisterImage, onRemoveImage }: Props) {
  const { open, setOpen, close, closeAndFocusTrigger, position, triggerRef, popoverRef } = usePopover()
  // キーボード（Enter / Space）で開いたか。そのときだけ、フォーカスを、窓の中に移す
  const [openedByKeyboard, setOpenedByKeyboard] = useState(false)
  // Tab で止まる選択肢（いまフォーカスのある、または、いまの背景の選択肢）。ほかは、Tab では止まらない（ローヴィング tabindex）
  const [focusedValue, setFocusedValue] = useState<Background>(BACKGROUND_OPTIONS[0].value)
  const [notice, setNotice] = useState<string | null>(null) // 登録できなかったときなどの、お知らせ
  // ファイル選びは、窓の外に置く（窓を閉じても、選んだ結果を受け取れるように）。どの行の「画像を選ぶ」かを覚えておく
  const fileInput = useRef<HTMLInputElement>(null)
  const targetSlot = useRef<UserImageSlot | null>(null)

  // キーボードで開いたときは、位置が決まって見える状態になってから、フォーカスを、いまの背景の選択肢に移す
  useEffect(() => {
    if (!open || !openedByKeyboard || position === null) return
    popoverRef.current?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')?.focus()
  }, [open, openedByKeyboard, position, popoverRef])

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') closeAndFocusTrigger()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, closeAndFocusTrigger])

  // 選択肢の上での矢印キーなど。フォーカスを動かすだけで、選ばない
  // （選ぶとすぐ背景が切り替わり、保存されて、窓が閉じるので、矢印キーで選ぶと、使えない。選ぶのは Enter か Space）
  function handleRadioKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const count = BACKGROUND_OPTIONS.length
    let next: number
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        next = (index + 1) % count // いちばん下の次は、いちばん上
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        next = (index - 1 + count) % count // いちばん上の前は、いちばん下
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = count - 1
        break
      default:
        return
    }
    e.preventDefault()
    popoverRef.current?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus()
  }

  function errorMessage(e: unknown, fallback: string) {
    return e instanceof Error ? e.message : fallback
  }

  async function handleFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target
    const file = input.files?.[0]
    input.value = '' // 同じファイルを、もう一度選べるように
    const slot = targetSlot.current
    if (!file || !slot) return
    closeAndFocusTrigger() // お知らせの窓が、選択の窓に隠れないように、先に閉じる
    try {
      await onRegisterImage(slot, file)
    } catch (error) {
      setNotice(errorMessage(error, '画像を登録できませんでした'))
    }
  }

  async function handleRemove(slot: UserImageSlot) {
    try {
      await onRemoveImage(slot)
    } catch (error) {
      setNotice(errorMessage(error, '画像を元に戻せませんでした'))
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(e) => {
          if (open) {
            close()
            return
          }
          setOpenedByKeyboard(e.detail === 0) // Enter / Space で押したときの click は、detail が 0（マウスは 1 以上）
          setFocusedValue(value ?? BACKGROUND_OPTIONS[0].value)
          setOpen(true)
        }}
        className="rounded-lg border border-[#d5dbe8] bg-white px-3 py-1.5 hover:bg-[#f1f4fa]"
      >
        背景
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="背景にする画像を選ぶ"
        className="hidden"
        onChange={(e) => void handleFileChosen(e)}
      />
      {open &&
        createPortal(
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Tab を、窓の中で回すための処理
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="背景を選ぶ"
            onKeyDown={(e) => wrapTabFocus(e, popoverRef.current)}
            // 位置が決まるまでは、見えないようにしておく
            style={{ position: 'fixed', top: position?.top ?? 0, left: position?.left ?? 0 }}
            className={`z-[60] w-[26rem] max-w-[calc(100vw-1rem)] rounded-xl border border-[#d5dbe8] bg-white p-2 shadow-xl ${position ? '' : 'invisible'}`}
          >
            <div role="radiogroup" aria-label="背景" className="flex flex-col gap-1">
              {BACKGROUND_OPTIONS.map((option, index) => {
                const selected = option.value === value
                const slot = isUserImageSlot(option.value) ? option.value : null
                const imageUrl = slot ? imageUrls[slot] : undefined
                return (
                  <div key={option.value} className="flex items-center gap-1">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      tabIndex={option.value === focusedValue ? 0 : -1}
                      onFocus={() => setFocusedValue(option.value)}
                      onKeyDown={(e) => handleRadioKeyDown(e, index)}
                      onClick={() => {
                        onSelect(option.value)
                        closeAndFocusTrigger()
                      }}
                      className={`flex flex-1 items-center gap-3 rounded-lg border px-2 py-1.5 text-left ${
                        selected ? 'border-[#4f7cff] bg-[#eef2fb]' : 'border-transparent hover:bg-[#f1f4fa]'
                      }`}
                    >
                      {/* 見本：背景と同じ見た目の小さな四角。自分の画像を登録していれば、その画像 */}
                      <span
                        aria-hidden="true"
                        data-user-image={imageUrl}
                        style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}
                        className={`${imageUrl ? 'bg-cover bg-center' : `bg-scene-${option.value}`} block h-9 w-14 flex-none rounded-md border border-black/15`}
                      />
                      <span>{option.label}</span>
                    </button>
                    {slot && (
                      <>
                        <button
                          type="button"
                          aria-label={`${option.label}の画像を選ぶ`}
                          onClick={() => {
                            targetSlot.current = slot
                            fileInput.current?.click()
                          }}
                          className={SMALL_BUTTON}
                        >
                          画像を選ぶ
                        </button>
                        {imageUrl && (
                          <button
                            type="button"
                            aria-label={`${option.label}の画像を元に戻す`}
                            onClick={() => void handleRemove(slot)}
                            className={SMALL_BUTTON}
                          >
                            元に戻す
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>,
          document.body,
        )}
      {notice && (
        <ConfirmDialog
          title="お知らせ"
          message={notice}
          onClose={() => setNotice(null)}
          buttons={[{ label: '閉じる', tone: 'primary', onClick: () => setNotice(null), autoFocus: true }]}
        />
      )}
    </>
  )
}
