#ifndef YOLO_ZIG_H_
#define YOLO_ZIG_H_

#include <stdint.h>

#if defined(_WIN32)
#  if defined(YOLO_ZIG_SHARED)
#    define YOLO_ZIG_API __declspec(dllimport)
#  else
#    define YOLO_ZIG_API
#  endif
#else
#  define YOLO_ZIG_API __attribute__((visibility("default")))
#endif

#ifdef __cplusplus
extern "C" {
#endif

YOLO_ZIG_API uint32_t yolo_zig_abi_version(void);
YOLO_ZIG_API const char *yolo_zig_target_os(void);
YOLO_ZIG_API const char *yolo_zig_target_arch(void);

#ifdef __cplusplus
}
#endif

#endif /* YOLO_ZIG_H_ */
