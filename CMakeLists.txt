cmake_minimum_required(VERSION 3.18)
project(CORTEXEngine VERSION 0.1.0 LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

option(BUILD_WITH_BULLET "Enable Bullet physics integration" OFF)
option(BUILD_WITH_VULKAN "Enable Vulkan renderer" OFF)
option(BUILD_WITH_OPENGL "Enable OpenGL renderer" OFF)
option(ENABLE_REPRODUCIBLE_BUILDS "Enable reproducible/deterministic build flags" ON)
option(BUILD_PYBIND "Enable Python bindings (pybind11)" ON)

# Prefer vcpkg toolchain if VCPKG_ROOT is set and no toolchain was provided
if(NOT DEFINED CMAKE_TOOLCHAIN_FILE)
  if(DEFINED ENV{VCPKG_ROOT})
    set(CMAKE_TOOLCHAIN_FILE "$ENV{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake" CACHE STRING "Vcpkg toolchain file" FORCE)
    message(STATUS "Using vcpkg toolchain from VCPKG_ROOT: $ENV{VCPKG_ROOT}")
  endif()
endif()

message(STATUS "CMake generator: ${CMAKE_GENERATOR}")
message(STATUS "C compiler: ${CMAKE_C_COMPILER_ID} ${CMAKE_C_COMPILER_VERSION}")
message(STATUS "CXX compiler: ${CMAKE_CXX_COMPILER_ID} ${CMAKE_CXX_COMPILER_VERSION}")
message(STATUS "BUILD_WITH_BULLET=${BUILD_WITH_BULLET} BUILD_WITH_VULKAN=${BUILD_WITH_VULKAN} BUILD_WITH_OPENGL=${BUILD_WITH_OPENGL}")

# Compiler / reproducible build flags
if(ENABLE_REPRODUCIBLE_BUILDS)
  set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
  if(MSVC)
    # MSVC deterministic option
    add_compile_options(/Brepro)
    # Encourage deterministic PDBs where available
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} /DEBUG:FULL")
  else()
    # Strip non-deterministic paths from debug info and normalize build IDs
    add_compile_options(-fno-ident -fdebug-prefix-map=${CMAKE_SOURCE_DIR}=.)
    set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} -Wl,--build-id=sha1")
  endif()
endif()

# Helper to check for packages and print actionable messages
function(check_dependency PKG)
  # try common package names first
  find_package(${PKG} QUIET)
  if(NOT ${PKG}_FOUND AND NOT TARGET ${PKG} AND NOT TARGET ${PKG}::${PKG})
    message(WARNING "Dependency ${PKG} not found. If you use vcpkg, run bootstrap-vcpkg.bat and install ${PKG} (x64-windows or your triplet).")
  else()
    message(STATUS "Dependency ${PKG} found.")
  endif()
endfunction()

# Check but don't fail configure; provide guidance
check_dependency(Vulkan)
check_dependency(glfw3)
check_dependency(glm)
check_dependency(Bullet)

add_subdirectory(src)

# Create CortexEngine executable and dependency test targets
add_executable(CortexEngine
  src/main.cpp
)

target_link_libraries(CortexEngine PRIVATE cortex_core cortex_rendering)

eventually_find_and_link:
# Attempt to find common dependencies via CMake/vcpkg
find_package(Vulkan QUIET)
find_package(glfw3 CONFIG QUIET)
find_package(glm CONFIG QUIET)
find_package(Bullet CONFIG QUIET)

# Vulkan linking
if(TARGET Vulkan::Vulkan)
  target_link_libraries(CortexEngine PRIVATE Vulkan::Vulkan)
elseif(Vulkan_FOUND)
  if(DEFINED Vulkan_INCLUDE_DIRS)
    target_include_directories(CortexEngine PRIVATE ${Vulkan_INCLUDE_DIRS})
  endif()
  if(DEFINED Vulkan_LIBRARIES)
    target_link_libraries(CortexEngine PRIVATE ${Vulkan_LIBRARIES})
  endif()
endif()

# GLFW linking (try common imported target names)
if(TARGET glfw)
  target_link_libraries(CortexEngine PRIVATE glfw)
elseif(TARGET glfw3)
  target_link_libraries(CortexEngine PRIVATE glfw3)
elseif(glfw3_FOUND)
  if(DEFINED glfw3_LIBRARIES)
    target_link_libraries(CortexEngine PRIVATE ${glfw3_LIBRARIES})
  endif()
endif()

# glm
if(TARGET glm)
  target_link_libraries(CortexEngine PRIVATE glm)
elseif(glm_FOUND)
  # glm is header-only in many packages
  if(DEFINED GLM_INCLUDE_DIRS)
    target_include_directories(CortexEngine PRIVATE ${GLM_INCLUDE_DIRS})
  endif()
endif()

# Bullet linking
if(TARGET Bullet::Bullet)
  target_link_libraries(CortexEngine PRIVATE Bullet::Bullet)
elseif(BULLET_FOUND)
  if(DEFINED BULLET_INCLUDE_DIRS)
    target_include_directories(CortexEngine PRIVATE ${BULLET_INCLUDE_DIRS})
  endif()
  if(DEFINED BULLET_LIBRARIES)
    target_link_libraries(CortexEngine PRIVATE ${BULLET_LIBRARIES})
  endif()
endif()

# Compiler-specific flags
if(MSVC)
  message(STATUS "Using MSVC toolchain")
  target_compile_options(CortexEngine PRIVATE /W4 /permissive-)
elseif(CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  message(STATUS "Using Clang toolchain")
  target_compile_options(CortexEngine PRIVATE -Wall -Wextra -Wpedantic)
elseif(CMAKE_CXX_COMPILER_ID MATCHES "GNU")
  message(STATUS "Using GCC toolchain")
  target_compile_options(CortexEngine PRIVATE -Wall -Wextra -Wpedantic)
endif()

# Simple dependency compile test target
add_executable(dependency_test src/dependency_test.cpp)
if(TARGET Vulkan::Vulkan)
  target_link_libraries(dependency_test PRIVATE Vulkan::Vulkan)
endif()

# Ensure include dirs
target_include_directories(CortexEngine PRIVATE ${CMAKE_SOURCE_DIR}/include)

