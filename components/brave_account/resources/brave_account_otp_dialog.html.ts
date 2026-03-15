/* Copyright (c) 2026 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at https://mozilla.org/MPL/2.0/. */

import { html } from '//resources/lit/v3_0/lit.rollup.js'
import { loadTimeData } from '//resources/js/load_time_data.js'

import './brave_account_dialog.js'
import './brave_account_otp_input.js'
import { BraveAccountOtpDialogElement } from './brave_account_otp_dialog.js'
import type { OtpInputEventDetail } from './brave_account_otp_input.js'
import { BraveAccountStrings } from './brave_components_webui_strings.js'

export function getHtml(this: BraveAccountOtpDialogElement) {
  return html`<!--_html_template_start_-->
    <brave-account-dialog
      dialog-description=${loadTimeData.getStringF(
        BraveAccountStrings.BRAVE_ACCOUNT_OTP_DIALOG_DESCRIPTION,
        this.otpDigits,
      )}
      dialog-title="$i18n{BRAVE_ACCOUNT_OTP_DIALOG_TITLE}"
      show-back-button
    >
      <div slot="inputs">
        <brave-account-otp-input
          .digits=${this.otpDigits}
          @otp-input=${(e: CustomEvent<OtpInputEventDetail>) => {
            this.code = e.detail.code
            this.isCodeComplete = e.detail.isComplete
          }}
        >
        </brave-account-otp-input>
      </div>
      <leo-button
        slot="buttons"
        ?isDisabled=${!this.isCodeComplete}
        @click=${this.onConfirmCodeButtonClicked}
      >
        $i18n{BRAVE_ACCOUNT_OTP_CONFIRM_CODE_BUTTON_LABEL}
      </leo-button>
      <leo-button
        slot="buttons"
        kind="plain"
        @click=${this.onResendEmailCodeClicked}
      >
        $i18n{BRAVE_ACCOUNT_OTP_RESEND_EMAIL_CODE_BUTTON_LABEL}
      </leo-button>
    </brave-account-dialog>
    <!--_html_template_end_-->`
}
