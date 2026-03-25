add_library(cortex_utils STATIC utils/Math.cpp)
target_include_directories(cortex_utils PUBLIC ${CMAKE_SOURCE_DIR}/include)

# Core engine library composed of ECS and utilities
add_library(cortex_core STATIC
  ecs/ECSWorld.cpp
  ecs/TransformSoA.cpp
  ecs/Registry.cpp
  scene/SceneGraph.cpp
  scene/SceneNode.cpp
  scene/Frustum.cpp
  utils/Math.cpp
)

add_library(cortex_physics STATIC
  physics/PhysicsEngine.cpp
)

target_include_directories(cortex_physics PUBLIC ${CMAKE_SOURCE_DIR}/include)

# If BUILD_WITH_BULLET is enabled, try to find Bullet and link
if(BUILD_WITH_BULLET)
  find_package(Bullet CONFIG QUIET)
  if(BULLET_FOUND)
    message(STATUS "Linking Bullet libraries")
    target_include_directories(cortex_physics PUBLIC ${BULLET_INCLUDE_DIRS})
    target_link_libraries(cortex_physics PUBLIC ${BULLET_LIBRARIES})
  else()
    message(WARNING "BUILD_WITH_BULLET is ON but Bullet not found. Build may fail.")
  endif()
endif()

target_link_libraries(cortex_core PUBLIC cortex_physics)

target_include_directories(cortex_core PUBLIC ${CMAKE_SOURCE_DIR}/include)

target_link_libraries(cortex_core PUBLIC cortex_utils)

# install targets (optional)
install(TARGETS cortex_utils cortex_core
        ARCHIVE DESTINATION lib
        LIBRARY DESTINATION lib
        RUNTIME DESTINATION bin)

add_library(cortex_rendering STATIC
  rendering/VulkanRenderer.cpp
  rendering/GLRenderer.cpp
)

target_include_directories(cortex_rendering PUBLIC ${CMAKE_SOURCE_DIR}/include)

target_link_libraries(cortex_rendering PUBLIC cortex_core cortex_physics)


add_library(cortex_animation STATIC
animation/AnimSystem.cpp
)

target_include_directories(cortex_animation PUBLIC ${CMAKE_SOURCE_DIR}/include)

target_link_libraries(cortex_core PUBLIC cortex_animation)


add_library(cortex_networking STATIC
  networking/NetworkSystem.cpp
)

target_include_directories(cortex_networking PUBLIC ${CMAKE_SOURCE_DIR}/include)

target_link_libraries(cortex_networking PUBLIC cortex_core)


add_library(cortex_ai STATIC
  ai/CORTEXBusinessAI.cpp
)

target_include_directories(cortex_ai PUBLIC ${CMAKE_SOURCE_DIR}/include)

target_link_libraries(cortex_core PUBLIC cortex_ai)

# Simple dependency compile test target
add_executable(dependency_test src/dependency_test.cpp)
if(TARGET Vulkan::Vulkan)
  target_link_libraries(dependency_test PRIVATE Vulkan::Vulkan)
endif()

# Agent bridge - small C++ CLI used by Python agents for privileged operations
add_executable(ai_agent_bridge src/ai/agent_bridge.cpp src/ai/agent_bridge_lib.cpp)

# Optional Python bindings via pybind11 (controlled by BUILD_PYBIND option)
if(BUILD_PYBIND)
  find_package(pybind11 CONFIG QUIET)
  if(pybind11_FOUND)
    add_library(py_ai_bridge MODULE src/ai/agent_bridge_bindings.cpp)
    # Expose build flag to the binding translation unit so the #ifdef sees it
    target_compile_definitions(py_ai_bridge PRIVATE BUILD_PYBIND)
    target_link_libraries(py_ai_bridge PRIVATE pybind11::module)
    set_target_properties(py_ai_bridge PROPERTIES PREFIX "")
    message(STATUS "pybind11 found: building Python ai bridge module")
  else()
    message(WARNING "BUILD_PYBIND is ON but pybind11 not found. Install pybind11 in vcpkg or system.")
  endif()
else()
  message(STATUS "BUILD_PYBIND disabled: skipping Python bindings")
endif()
set_target_properties(ai_agent_bridge PROPERTIES OUTPUT_NAME "ai_agent_bridge")
if(MSVC)
  target_compile_options(ai_agent_bridge PRIVATE /W4)
else()
  target_compile_options(ai_agent_bridge PRIVATE -Wall -Wextra -Wpedantic)
endif()

# Ensure include dirs
target_include_directories(cortex_core PUBLIC ${CMAKE_SOURCE_DIR}/include)

