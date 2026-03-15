/* Copyright (c) 2026 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at https://mozilla.org/MPL/2.0/. */

import { CrLitElement } from '//resources/lit/v3_0/lit.rollup.js'

import { getCss } from './brave_account_otp_input.css.js'
import { getHtml } from './brave_account_otp_input.html.js'

export type OtpInputEventDetail = { code: string; isComplete: boolean }

export class BraveAccountOtpInputElement extends CrLitElement {
  static get is() {
    return 'brave-account-otp-input'
  }

  static override get styles() {
    return getCss()
  }

  override render() {
    return getHtml.bind(this)()
  }

  static override get properties() {
    return {
      digits: { type: Number },
    }
  }

  // Prevent automatic text selection on focus by placing the caret at the end.
  // This avoids the visual highlight while keeping the existing value intact.
  protected onFocus(detail: { innerEvent: FocusEvent & { target: HTMLInputElement } }) {
    const target = detail.innerEvent.target
    target.setSelectionRange(target.value.length, target.value.length)
  }

  protected onInput(
    detail: { value: string; innerEvent: Event & { target: HTMLInputElement } },
    index: number
  ) {
    const inputs = this.getInputs()
    const currentInput = inputs[index]
    if (!currentInput) {
      return
    }

    const digit = detail.value.replace(/\D/g, '').slice(-1)
    this.setInputValue(currentInput, digit)

    if (digit && index < this.digits - 1) {
      this.focusInput(index + 1)
    }

    this.emitCode()
  }

  // Handles OTP editing at the key level
  // instead of relying on `input`/`beforeinput`.
  //
  // Rationale:
  // - with `maxlength="1"`, typing a new digit into a filled box does not
  //   change the value, so no `input` event fires.
  // - `beforeinput` could be used to work around this, but iOS Safari has
  //   inconsistent behavior (e.g. empty `e.data`, missing subsequent `input`
  //   events when overwriting).
  // - blocking unwanted keys here prevents invalid input from ever entering
  //   the field and ensures consistent behavior across platforms.
  //
  // In short: `keydown` provides the most reliable cross-platform hook for
  // implementing overwrite and filtering for single-digit OTP inputs.
  protected onKeyDown(detail: {innerEvent: KeyboardEvent}, index: number) {
    const inputs = this.getInputs()
    const currentInput = inputs[index]
    if (!currentInput) {
      return
    }

    const e = detail.innerEvent
    // Ignore keys pressed with
    if (e.altKey || e.ctrlKey || e.metaKey) {
      return
    }

    const allowedKeys = new Set([
      'Backspace',
      'Delete',
      'Tab',
      'ArrowLeft',
      'ArrowRight',
    ])

    const isDigit = /^\d$/.test(e.key)
    const isAllowedKey = allowedKeys.has(e.key)

    // Block everything except digits and allowed control/navigation keys.
    if (!isDigit && !isAllowedKey) {
      e.preventDefault()
      return
    }

    if (isDigit) {
      if (this.getInputValue(currentInput)) {
        e.preventDefault()
        this.setInputValue(currentInput, e.key)
  
        if (index < this.digits - 1) {
          this.focusInput(index + 1)
        }
  
        this.emitCode()
      }

      return
    }
  
    if (e.key === 'Backspace') {
      const currentValue = this.getInputValue(currentInput)
      if (currentValue) {
        return
      }
  
      if (index > 0) {
        const previousInput = inputs[index - 1]
        if (previousInput) {
          this.setInputValue(previousInput, '')
          this.focusInput(index - 1)
          e.preventDefault()
          this.emitCode()
        }
      }
      return
    }

    // Arrow navigation
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      this.focusInput(index - 1)
      return
    }

    if (e.key === 'ArrowRight' && index < this.digits - 1) {
      e.preventDefault()
      this.focusInput(index + 1)
      return
    }
  }

  protected onPaste(e: ClipboardEvent) {
    e.preventDefault()
    const pastedData = e.clipboardData?.getData('text') || ''
    const digits = pastedData.replace(/\D/g, '')

    const leoInputs = this.getInputs()

    // Find which input is currently focused
    let startIndex = 0
    const activeElement = this.shadowRoot?.activeElement || document.activeElement
    for (let i = 0; i < leoInputs.length; i++) {
      const leoInput = leoInputs[i]
      if (leoInput === activeElement) {
        startIndex = i
        break
      }
    }

    // Paste starting from the focused input
    digits.split('').forEach((char, offset) => {
      const index = startIndex + offset
      if (index >= this.digits) return

      const leoInput = leoInputs[index]
      if (leoInput) {
        this.setInputValue(leoInput, char)
      }
    })

    // Focus the next empty input or the last one
    const nextIndex = Math.min(startIndex + digits.length, this.digits - 1)
    this.focusInput(nextIndex)

    this.emitCode()
  }

  private getInputs(): HTMLElement[] {
    return Array.from(
      this.shadowRoot?.querySelectorAll('leo-input') ?? [],
    )
  }

  private focusInput(index: number) {
    const inputs = this.getInputs()
    const input = inputs[index]
    if (input) {
      input.focus()
    }
  }

  private setInputValue(leoInput: HTMLElement, value: string) {
    // Set the value property directly on leo-input
    (leoInput as any).value = value
  }

  private getInputValue(leoInput: HTMLElement): string {
    return (leoInput as any).value || ''
  }

  private emitCode() {
    const inputs = this.getInputs()
    const code = inputs.map((input) => this.getInputValue(input)).join('')

    this.fire('otp-input', {
      code,
      isComplete: code.length === this.digits,
    } satisfies OtpInputEventDetail)
  }

  protected accessor digits = 8
}

declare global {
  interface HTMLElementTagNameMap {
    'brave-account-otp-input': BraveAccountOtpInputElement
  }
}

customElements.define(
  BraveAccountOtpInputElement.is,
  BraveAccountOtpInputElement,
)
