#pragma once

#include <unordered_map>
#include <memory>
#include <string>
#include <vector>
#include "SceneNode.h"
#include "Frustum.h"

namespace cortex::scene {

class SceneGraph {
public:
    SceneGraph();

    NodeId createNode(const std::string &name, NodeId parent = InvalidNode);
    void destroyNode(NodeId id);

    SceneNode* getNode(NodeId id);

    // Mark node dirty and propagate to children
    void markDirty(NodeId id);

    // Ensure world matrices up-to-date for node (recursively updates parents)
    const std::array<float,16>& getWorldMatrix(NodeId id);

    // Frustum culling: returns list of visible node ids
    std::vector<NodeId> cull(const Frustum& frustum) const;

private:
    NodeId nextId_ = 1;
    std::unordered_map<NodeId, std::unique_ptr<SceneNode>> nodes_;

    // helper to update world matrix recursively
    void updateWorldRecursive(NodeId id);
};

} // namespace cortex::scene
