#pragma once

#include <string>
#include <vector>
#include <array>
#include <cstdint>
#include "../utils/Math.h"

namespace cortex::scene {

using NodeId = uint32_t;
inline constexpr NodeId InvalidNode = 0;

struct SceneNode {
    NodeId id = InvalidNode;
    std::string name;
    NodeId parent = InvalidNode;
    std::vector<NodeId> children;

    // Local transform
    cortex::utils::Vec3 position{0,0,0};
    cortex::utils::Vec3 scale{1,1,1};
    cortex::utils::Vec3 rotation{0,0,0}; // Euler in radians for simplicity

    // World transform matrix (row-major 4x4)
    std::array<float,16> worldMatrix{};
    std::array<float,16> localMatrix{};

    bool dirty = true;

    SceneNode() = default;
    explicit SceneNode(NodeId nid, const std::string &n): id(nid), name(n) {}

    void markDirty();
    void updateLocalMatrix();
};

} // namespace cortex::scene
