# SPDX-License-Identifier: MIT OR Apache-2.0
cmake_minimum_required(VERSION 3.24)
project(EOSSDK VERSION 1.16.4 LANGUAGES C CXX)

set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 20)

add_library(EOSSDK_Static STATIC Src/eos_sdk_shim.c)
target_include_directories(EOSSDK_Static PUBLIC Include)

add_library(EOSSDK_Shared SHARED Src/eos_sdk_shim.c)
target_compile_definitions(EOSSDK_Shared PRIVATE EOS_BUILD_DLL=1)
target_include_directories(EOSSDK_Shared PUBLIC Include)
