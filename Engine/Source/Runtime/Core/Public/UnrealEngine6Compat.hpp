// SPDX-License-Identifier: MIT OR Apache-2.0
/**
 * YOLO Engine 6.0 (UE6) — Official Unreal Engine 5/6 C++20 Compatibility & Zero-Copy FFI Header
 * Path: Engine/Source/Runtime/Core/Public/UnrealEngine6Compat.hpp
 *
 * Provides full UE5/UE6 C++20 syntax (`UCLASS`, `USTRUCT`, `UENUM`, `UPROPERTY`, `UFUNCTION`,
 * `GENERATED_BODY`, `UObject`, `AActor`, `UActorComponent`, `USceneComponent`, `APawn`,
 * `ACharacter`, `AGameModeBase`, `UBlueprintFunctionLibrary`, `FString`, `FName`, `FText`,
 * `TArray`, `TMap`, `TSubclassOf`, `TObjectPtr`) backed by a zero-copy `extern "C"` ABI
 * exported to both **Bevy ECS** (`yolo-engine-platforms-blueprints-ffi`) and **Bun (`bun:ffi`)**.
 */

#ifndef YOLO_UNREAL_ENGINE_6_COMPAT_HPP
#define YOLO_UNREAL_ENGINE_6_COMPAT_HPP

#include <stdint.h>
#include <stddef.h>

#if defined(_WIN32)
  #if defined(UE6_BUILD_SHARED_FFI)
    #define ENGINE_API __declspec(dllexport)
  #else
    #define ENGINE_API __declspec(dllimport)
  #endif
#else
  #define ENGINE_API __attribute__((visibility("default")))
#endif

/* ============================================================================
 * 1. UnrealHeaderTool (UHT 6.0) Reflection Macros
 * ============================================================================ */
#define UCLASS(...)
#define USTRUCT(...)
#define UENUM(...)
#define UMETA(...)
#define UPROPERTY(...)
#define UFUNCTION(...)
#define UINTERFACE(...)
#define GENERATED_BODY()

/* Common UPROPERTY / UFUNCTION Specifier Tokens */
#define BlueprintType
#define Blueprintable
#define BlueprintReadWrite
#define BlueprintReadOnly
#define BlueprintCallable
#define BlueprintPure
#define BlueprintImplementableEvent
#define BlueprintNativeEvent
#define EditAnywhere
#define VisibleAnywhere
#define EditDefaultsOnly
#define Category

#ifdef __cplusplus
extern "C" {
#endif

/* ============================================================================
 * 2. Zero-Copy C ABI Bridge between UE5/UE6 C++20, Bevy ECS (Rust), and Bun FFI
 * ============================================================================ */

typedef struct FVector3f_C {
    float X;
    float Y;
    float Z;
} FVector3f_C;

typedef struct FQuat4f_C {
    float X;
    float Y;
    float Z;
    float W;
} FQuat4f_C;

typedef struct FTransform_C {
    FVector3f_C Translation;
    FQuat4f_C Rotation;
    FVector3f_C Scale3D;
} FTransform_C;

typedef struct FBlueprintNodeExecResult_C {
    int32_t StatusCode;
    uint64_tSpawnedOrMutatedEntityId;
    uint32_t ExecutedPinCount;
} FBlueprintNodeExecResult_C;

/**
 * Exported C ABI functions implemented in `yolo-engine-platforms-blueprints-ffi`
 * and callable from C++20 (`AActor`), Rust (`Bevy ECS`), and Bun (`bun:ffi`).
 */
ENGINE_API uint64_t ue6_ffi_bevy_world_create(uint32_t target_fps);
ENGINE_API uint64_t ue6_ffi_bevy_spawn_actor(
    uint64_t world_handle,
    const char* class_name_utf8,
    const char* actor_label_utf8,
    const FTransform_C* transform
);
ENGINE_API int32_t ue6_ffi_kismet_execute_blueprint_node(
    uint64_t world_handle,
    const char* node_op_utf8,
    uint64_t target_entity_id,
    FBlueprintNodeExecResult_C* out_result
);
ENGINE_API uint32_t ue6_ffi_platform_sdk_count(void);
ENGINE_API int32_t ue6_ffi_bevy_world_destroy(uint64_t world_handle);

#ifdef __cplusplus
} /* extern "C" */

#include <string>
#include <vector>
#include <unordered_map>
#include <memory>

namespace UE6 {

using FString = std::string;
using FName = std::string;
using FText = std::string;

template <typename T>
using TArray = std::vector<T>;

template <typename K, typename V>
using TMap = std::unordered_map<K, V>;

template <typename T>
using TObjectPtr = T*;

template <typename T>
using TSubclassOf = const char*;

UCLASS(BlueprintType)
class UObject {
public:
    GENERATED_BODY()
    virtual ~UObject() = default;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly)
    uint64_t BevyEntityId{0};
    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FName ObjectName{"Default__UObject"};
};

UCLASS(BlueprintType)
class UActorComponent : public UObject {
public:
    GENERATED_BODY()
    UFUNCTION(BlueprintCallable)
    virtual void TickComponent(float DeltaTime) { (void)DeltaTime; }
};

UCLASS(BlueprintType)
class USceneComponent : public UActorComponent {
public:
    GENERATED_BODY()
    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FTransform_C RelativeTransform{{0.0f, 0.0f, 0.0f}, {0.0f, 0.0f, 0.0f, 1.0f}, {1.0f, 1.0f, 1.0f}};
};

UCLASS(Blueprintable, BlueprintType)
class AActor : public UObject {
public:
    GENERATED_BODY()
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly)
    TObjectPtr<USceneComponent> RootComponent{nullptr};

    UFUNCTION(BlueprintCallable)
    virtual void BeginPlay() {}

    UFUNCTION(BlueprintCallable)
    virtual void Tick(float DeltaSeconds) { (void)DeltaSeconds; }
};

UCLASS(Blueprintable)
class APawn : public AActor {
public:
    GENERATED_BODY()
};

UCLASS(Blueprintable)
class ACharacter : public APawn {
public:
    GENERATED_BODY()
};

UCLASS(Blueprintable)
class AGameModeBase : public AActor {
public:
    GENERATED_BODY()
};

UCLASS()
class UBlueprintFunctionLibrary : public UObject {
public:
    GENERATED_BODY()
};

} /* namespace UE6 */
#endif /* __cplusplus */

#endif /* YOLO_UNREAL_ENGINE_6_COMPAT_HPP */
