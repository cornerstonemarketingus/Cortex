#include "../../include/cortex/scene/SceneGraph.h"
#include <stdexcept>
#include <algorithm>

using namespace cortex::scene;

SceneGraph::SceneGraph() {}

NodeId SceneGraph::createNode(const std::string &name, NodeId parent) {
    NodeId id = nextId_++;
    auto node = std::make_unique<SceneNode>(id, name);
    node->parent = parent;
    node->dirty = true;
    node->updateLocalMatrix();
    if (parent != InvalidNode) {
        auto pit = nodes_.find(parent);
        if (pit == nodes_.end()) throw std::runtime_error("Parent not found");
        pit->second->children.push_back(id);
    }
    nodes_.emplace(id, std::move(node));
    return id;
}

void SceneGraph::destroyNode(NodeId id) {
    auto it = nodes_.find(id);
    if (it == nodes_.end()) return;
    // remove from parent's children
    if (it->second->parent != InvalidNode) {
        auto pit = nodes_.find(it->second->parent);
        if (pit != nodes_.end()) {
            auto &ch = pit->second->children;
            ch.erase(std::remove(ch.begin(), ch.end(), id), ch.end());
        }
    }
    // recursively destroy children
    for (auto c : it->second->children) destroyNode(c);
    nodes_.erase(it);
}

SceneNode* SceneGraph::getNode(NodeId id) {
    auto it = nodes_.find(id);
    if (it == nodes_.end()) return nullptr;
    return it->second.get();
}

void SceneGraph::markDirty(NodeId id) {
    auto n = getNode(id);
    if (!n) return;
    if (!n->dirty) {
        n->dirty = true;
        for (auto c : n->children) markDirty(c);
    }
}

void SceneGraph::updateWorldRecursive(NodeId id) {
    auto n = getNode(id);
    if (!n) return;
    if (n->dirty) {
        if (n->parent == InvalidNode) {
            n->worldMatrix = n->localMatrix;
        } else {
            updateWorldRecursive(n->parent);
            auto p = getNode(n->parent);
            if (p) {
                // multiply p->worldMatrix * n->localMatrix
                std::array<float,16> out{};
                for (int r=0;r<4;++r) for (int c=0;c<4;++c) {
                    float v=0.0f;
                    for (int k=0;k<4;++k) v += p->worldMatrix[r*4 + k] * n->localMatrix[k*4 + c];
                    out[r*4 + c] = v;
                }
                n->worldMatrix = out;
            } else {
                n->worldMatrix = n->localMatrix;
            }
        }
        n->dirty = false;
    }
}

const std::array<float,16>& SceneGraph::getWorldMatrix(NodeId id) {
    auto n = getNode(id);
    if (!n) throw std::runtime_error("Node not found");
    updateWorldRecursive(id);
    return n->worldMatrix;
}

std::vector<NodeId> SceneGraph::cull(const Frustum& frustum) const {
    std::vector<NodeId> visible;
    // Simple traversal: for each node, test bounding sphere centered at world translation (w[12..14])
    for (auto &kv : nodes_) {
        const SceneNode* n = kv.second.get();
        // extract translation
        cortex::utils::Vec3 pos{n->worldMatrix[12], n->worldMatrix[13], n->worldMatrix[14]};
        cortex::utils::Vec3 min{pos.x - 0.5f, pos.y - 0.5f, pos.z - 0.5f};
        cortex::utils::Vec3 max{pos.x + 0.5f, pos.y + 0.5f, pos.z + 0.5f};
        if (frustum.intersectsAABB(min, max)) visible.push_back(n->id);
    }
    return visible;
}
