// SPDX-License-Identifier: MIT OR Apache-2.0
/**
 * YOLO Engine 6.0 (UE6) — Epic Online Services (EOS) C++20 RAII Wrapper & OnlineSubsystemEOS Bridge
 * Path: Engine/Source/ThirdParty/EOSSDK/Include/eos_sdk.hpp
 */

#ifndef YOLO_EOS_SDK_HPP
#define YOLO_EOS_SDK_HPP

#include "eos_sdk.h"
#include <string>
#include <string_view>
#include <stdexcept>

namespace UE6::EOS {

class FScopedEosPlatform final {
public:
    FScopedEosPlatform(
        const char* productName,
        const char* productVersion,
        const char* productId,
        const char* sandboxId,
        const char* deploymentId,
        const char* clientId,
        const char* clientSecret,
        bool isServer = false
    ) {
        EOS_InitializeOptions initOpts{};
        initOpts.ApiVersion = EOS_INITIALIZE_API_LATEST;
        initOpts.ProductName = productName;
        initOpts.ProductVersion = productVersion;

        const EOS_EResult initRes = EOS_Initialize(&initOpts);
        if (initRes != EOS_Success && initRes != EOS_AlreadyConfigured) {
            throw std::runtime_error("EOS_Initialize failed");
        }

        EOS_Platform_Options platOpts{};
        platOpts.ApiVersion = EOS_PLATFORM_OPTIONS_API_LATEST;
        platOpts.ProductId = productId;
        platOpts.SandboxId = sandboxId;
        platOpts.DeploymentId = deploymentId;
        platOpts.ClientCredentials.ClientId = clientId;
        platOpts.ClientCredentials.ClientSecret = clientSecret;
        platOpts.bIsServer = isServer ? EOS_TRUE : EOS_FALSE;
        platOpts.TickBudgetInMilliseconds = 2;

        platform_ = EOS_Platform_Create(&platOpts);
    }

    ~FScopedEosPlatform() noexcept {
        if (platform_ != nullptr) {
            EOS_Platform_Release(platform_);
            platform_ = nullptr;
        }
        EOS_Shutdown();
    }

    FScopedEosPlatform(const FScopedEosPlatform&) = delete;
    FScopedEosPlatform& operator=(const FScopedEosPlatform&) = delete;

    void Tick() noexcept {
        if (platform_ != nullptr) {
            EOS_Platform_Tick(platform_);
        }
    }

    [[nodiscard]] EOS_HPlatform GetHandle() const noexcept { return platform_; }
    [[nodiscard]] EOS_HAuth GetAuth() const noexcept { return EOS_Platform_GetAuthInterface(platform_); }
    [[nodiscard]] EOS_HConnect GetConnect() const noexcept { return EOS_Platform_GetConnectInterface(platform_); }
    [[nodiscard]] EOS_HAntiCheatClient GetAntiCheatClient() const noexcept {
        return EOS_Platform_GetAntiCheatClientInterface(platform_);
    }

private:
    EOS_HPlatform platform_{nullptr};
};

} // namespace UE6::EOS

#endif // YOLO_EOS_SDK_HPP
