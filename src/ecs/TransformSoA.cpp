#include "../../include/cortex/ecs/TransformSoA.h"
#include <stdexcept>

using namespace cortex::ecs;

void TransformSoA::add(EntityId id, const Transform& t) {
    if (indexOf_.count(id)) return;
    size_t idx = ids_.size();
    ids_.push_back(id);
    position_x_.push_back(t.position.x);
    position_y_.push_back(t.position.y);
    position_z_.push_back(t.position.z);
    scale_x_.push_back(t.scale.x);
    scale_y_.push_back(t.scale.y);
    scale_z_.push_back(t.scale.z);
    rotation_x_.push_back(t.rotation.x);
    rotation_y_.push_back(t.rotation.y);
    rotation_z_.push_back(t.rotation.z);
    indexOf_[id] = idx;
}

void TransformSoA::remove(EntityId id) {
    auto it = indexOf_.find(id);
    if (it == indexOf_.end()) return;
    size_t idx = it->second;
    size_t last = ids_.size() - 1;
    if (idx != last) {
        // move last into idx
        ids_[idx] = ids_[last];
        position_x_[idx] = position_x_[last];
        position_y_[idx] = position_y_[last];
        position_z_[idx] = position_z_[last];
        scale_x_[idx] = scale_x_[last];
        scale_y_[idx] = scale_y_[last];
        scale_z_[idx] = scale_z_[last];
        rotation_x_[idx] = rotation_x_[last];
        rotation_y_[idx] = rotation_y_[last];
        rotation_z_[idx] = rotation_z_[last];
        indexOf_[ids_[idx]] = idx;
    }
    ids_.pop_back(); position_x_.pop_back(); position_y_.pop_back(); position_z_.pop_back();
    scale_x_.pop_back(); scale_y_.pop_back(); scale_z_.pop_back();
    rotation_x_.pop_back(); rotation_y_.pop_back(); rotation_z_.pop_back();
    indexOf_.erase(it);
}

bool TransformSoA::has(EntityId id) const {
    return indexOf_.count(id) != 0;
}

Transform TransformSoA::get(EntityId id) const {
    auto it = indexOf_.find(id);
    if (it == indexOf_.end()) throw std::runtime_error("Transform not found");
    size_t idx = it->second;
    Transform t;
    t.position.x = position_x_[idx];
    t.position.y = position_y_[idx];
    t.position.z = position_z_[idx];
    t.scale.x = scale_x_[idx];
    t.scale.y = scale_y_[idx];
    t.scale.z = scale_z_[idx];
    t.rotation.x = rotation_x_[idx];
    t.rotation.y = rotation_y_[idx];
    t.rotation.z = rotation_z_[idx];
    return t;
}

void TransformSoA::set(EntityId id, const Transform& t) {
    auto it = indexOf_.find(id);
    if (it == indexOf_.end()) throw std::runtime_error("Transform not found");
    size_t idx = it->second;
    position_x_[idx] = t.position.x;
    position_y_[idx] = t.position.y;
    position_z_[idx] = t.position.z;
    scale_x_[idx] = t.scale.x;
    scale_y_[idx] = t.scale.y;
    scale_z_[idx] = t.scale.z;
    rotation_x_[idx] = t.rotation.x;
    rotation_y_[idx] = t.rotation.y;
    rotation_z_[idx] = t.rotation.z;
}
