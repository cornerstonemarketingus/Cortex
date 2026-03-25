#pragma once

#include <vector>
#include <unordered_map>
#include "../utils/Math.h"

namespace cortex::ecs {

struct Transform {
    cortex::utils::Vec3 position{0,0,0};
    cortex::utils::Vec3 scale{1,1,1};
    cortex::utils::Vec3 rotation{0,0,0}; // Euler angles for simplicity
};

// Structure of Arrays container for transforms to be SIMD/cache friendly
class TransformSoA {
public:
    TransformSoA() = default;

    void add(EntityId id, const Transform& t);
    void remove(EntityId id);
    bool has(EntityId id) const;
    Transform get(EntityId id) const;
    void set(EntityId id, const Transform& t);

    // Simple SIMD-friendly update loop placeholder (e.g., apply velocities)
    template<typename F>
    void forEach(F fn) {
        const size_t n = ids_.size();
        for (size_t i = 0; i < n; ++i) {
            fn(ids_[i], position_x_[i], position_y_[i], position_z_[i], scale_x_[i], scale_y_[i], scale_z_[i]);
        }
    }

private:
    std::vector<EntityId> ids_;
    std::vector<float> position_x_, position_y_, position_z_;
    std::vector<float> scale_x_, scale_y_, scale_z_;
    std::vector<float> rotation_x_, rotation_y_, rotation_z_;
    std::unordered_map<EntityId, size_t> indexOf_;
};

} // namespace cortex::ecs
