#include <iostream>

#include "yolo_zig.h"

int main() {
  std::cout << "{\"abi\":" << yolo_zig_abi_version() << ",\"os\":\""
            << yolo_zig_target_os() << "\",\"arch\":\""
            << yolo_zig_target_arch() << "\"}\n";
}
