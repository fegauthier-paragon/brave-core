/* Copyright (c) 2026 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at https://mozilla.org/MPL/2.0/. */

import { html } from '//resources/lit/v3_0/lit.rollup.js'

import { BraveAccountOtpInputElement } from './brave_account_otp_input.js'

export function getHtml(this: BraveAccountOtpInputElement) {
  const inputs = Array.from({ length: this.digits }, (_, index) => index)

  return html`<!--_html_template_start_-->
    <div class="label">
      $i18n{BRAVE_ACCOUNT_OTP_INPUT_LABEL}
    </div>
    <div class="otp-inputs" @paste=${this.onPaste}>
      ${inputs.map(
        (index) => html`
          <leo-input
            autofocus=${index === 0}
            inputmode="numeric"
            maxlength="1"
            pattern="[0-9]"
            type="text"
            @focus=${this.onFocus}
            @input=${(detail: { value: string; innerEvent: Event & { target: HTMLInputElement } }) => this.onInput(detail, index)}
            @keydown=${(detail: { innerEvent: KeyboardEvent }) => this.onKeyDown(detail, index)}
          >
          </leo-input>
        `,
      )}
    </div>
    <!--_html_template_end_-->`
}
