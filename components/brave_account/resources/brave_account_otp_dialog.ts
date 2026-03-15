/* Copyright (c) 2026 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at https://mozilla.org/MPL/2.0/. */

import { CrLitElement } from '//resources/lit/v3_0/lit.rollup.js'

import { getHtml } from './brave_account_otp_dialog.html.js'

export class BraveAccountOtpDialogElement extends CrLitElement {
  static get is() {
    return 'brave-account-otp-dialog'
  }

  override render() {
    return getHtml.bind(this)()
  }

  static override get properties() {
    return {
      code: { type: String },
      isCodeComplete: { type: Boolean },
      otpDigits: { type: Number },
    }
  }

  protected onConfirmCodeButtonClicked() {
    // TODO: Implement OTP verification logic
    this.fire('confirm-code', { code: this.code })
  }

  protected onResendEmailCodeClicked() {
    this.fire('resend-email-code')
  }

  protected accessor code = ''
  protected accessor isCodeComplete = false
  protected accessor otpDigits = 8
}

declare global {
  interface HTMLElementTagNameMap {
    'brave-account-otp-dialog': BraveAccountOtpDialogElement
  }
}

customElements.define(
  BraveAccountOtpDialogElement.is,
  BraveAccountOtpDialogElement,
)
