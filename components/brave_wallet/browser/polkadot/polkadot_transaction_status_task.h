/* Copyright (c) 2026 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef BRAVE_COMPONENTS_BRAVE_WALLET_BROWSER_POLKADOT_POLKADOT_TRANSACTION_STATUS_TASK_H_
#define BRAVE_COMPONENTS_BRAVE_WALLET_BROWSER_POLKADOT_POLKADOT_TRANSACTION_STATUS_TASK_H_

#include "base/strings/strcat.h"
#include "base/strings/string_number_conversions.h"
#include "brave/components/brave_wallet/browser/keyring_service.h"
#include "brave/components/brave_wallet/browser/polkadot/polkadot_extrinsic.h"
#include "brave/components/brave_wallet/browser/polkadot/polkadot_wallet_service.h"

namespace brave_wallet {

constexpr uint32_t kBlockStepSize = 5;

template <class R, class T>
std::optional<size_t> Position(R&& r, const T& val) {
  size_t i = 0;
  for (const auto& v : r) {
    if (v == val) {
      return i;
    }
    ++i;
  }
  return std::nullopt;
}

using GetTransactionStatusCallback = base::OnceCallback<void(
    base::expected<std::pair<bool, uint128_t>, std::string>)>;

class PolkadotTransactionStatusTask {
 public:
  PolkadotTransactionStatusTask(PolkadotWalletService& polkadot_wallet_service,
                                KeyringService& keyring_service,
                                mojom::AccountIdPtr sender_account_id,
                                std::string chain_id,
                                std::vector<uint8_t> extrinsic,
                                uint32_t block_num,
                                uint32_t mortality_period);
  ~PolkadotTransactionStatusTask();

  void Start(GetTransactionStatusCallback callback) {
    callback_ = std::move(callback);

    polkadot_wallet_service_->GetChainMetadata(
        chain_id_,
        base::BindOnce(&PolkadotTransactionStatusTask::OnGetChainMetadata,
                       weak_ptr_factory_.GetWeakPtr()));
  }

 private:
  PolkadotSubstrateRpc* GetPolkadotRpc() {
    return polkadot_wallet_service_->GetPolkadotRpc();
  }

  void OnGetChainMetadata(
      base::expected<PolkadotChainMetadata, std::string> chain_metadata) {
    CHECK(chain_metadata.has_value());

    chain_metadata_ = std::move(chain_metadata.value());

    LOG(INFO) << "Gathering block hashes for the associated blocks now...";
    for (uint32_t i = 0; i < kBlockStepSize; ++i) {
      LOG(INFO) << "Getting block hash for block " << block_num_ + i;
      GetPolkadotRpc()->GetBlockHash(
          chain_id_, block_num_ + i,
          base::BindOnce(
              &PolkadotTransactionStatusTask::OnGetBlockHashForStatus,
              weak_ptr_factory_.GetWeakPtr(), i));
    }
  }

  void OnGetBlockHashForStatus(
      uint32_t offset,
      std::optional<std::array<uint8_t, kPolkadotBlockHashSize>> block_hash,
      std::optional<std::string> err_str) {
    CHECK(!err_str.has_value());
    CHECK(block_hash.has_value());

    block_hashes_[offset] = block_hash;

    LOG(INFO) << "received block hash: "
              << base::HexEncodeLower(block_hashes_[offset].value());

    GetPolkadotRpc()->GetBlock(
        chain_id_, block_hash.value(),
        base::BindOnce(&PolkadotTransactionStatusTask::OnGetBlockForStatus,
                       weak_ptr_factory_.GetWeakPtr()));
  }

  void OnGetBlockForStatus(std::optional<PolkadotBlock> block,
                           std::optional<std::string> err_str) {
    CHECK(block);
    CHECK(!err_str);

    LOG(INFO) << "Got block with block number: " << block->header.block_number;
    // LOG(INFO) << "Found these extrinsics:";
    // for (const auto& extrinsic : block->extrinsics) {
    //   LOG(INFO) << extrinsic;
    // }

    auto user_extrinsic =
        base::StrCat({"0x", base::HexEncodeLower(extrinsic_)});

    auto idx = Position(block->extrinsics, user_extrinsic);
    if (idx.has_value()) {
      weak_ptr_factory_.InvalidateWeakPtrs();

      LOG(INFO) << "Found the extrinsic in block: "
                << block->header.block_number
                << " at extrinsic index: " << *idx;

      extrinsic_idx_ = idx;

      GetPolkadotRpc()->GetEvents(
          chain_id_, block->header.GetHash(),
          base::BindOnce(&PolkadotTransactionStatusTask::OnGetEvents,
                         weak_ptr_factory_.GetWeakPtr()));
    }
  }

  void OnGetEvents(base::expected<std::vector<uint8_t>, std::string> events) {
    CHECK(events.has_value());

    auto pubkey = keyring_service_->GetPolkadotPubKey(sender_account_id_);
    CHECK(pubkey);

    std::array<uint8_t, 16> fee = {};

    bool was_successful = was_extrinsic_successful(
        ::rust::Slice<const uint8_t>(events.value()), *extrinsic_idx_, *pubkey,
        **chain_metadata_, fee);

    std::move(callback_).Run(
        base::ok(std::pair(was_successful, base::bit_cast<uint128_t>(fee))));
  }

  std::array<std::optional<std::array<uint8_t, kPolkadotBlockHashSize>>,
             kBlockStepSize>
      block_hashes_ = {};

  base::raw_ref<PolkadotWalletService> polkadot_wallet_service_;
  base::raw_ref<KeyringService> keyring_service_;
  std::optional<PolkadotChainMetadata> chain_metadata_;

  mojom::AccountIdPtr sender_account_id_;
  std::string chain_id_;
  std::vector<uint8_t> extrinsic_;
  uint32_t block_num_;
  uint32_t mortality_period_;

  std::optional<size_t> extrinsic_idx_;
  GetTransactionStatusCallback callback_;

  base::WeakPtrFactory<PolkadotTransactionStatusTask> weak_ptr_factory_{this};
};

}  // namespace brave_wallet

#endif  // BRAVE_COMPONENTS_BRAVE_WALLET_BROWSER_POLKADOT_POLKADOT_TRANSACTION_STATUS_TASK_H_
