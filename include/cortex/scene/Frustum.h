#pragma once

#include <array>
#include "../utils/Math.h"

namespace cortex::scene {

struct Plane { float a,b,c,d; };

class Frustum {
public:
    // planes: left,right,top,bottom,near,far
    std::array<Plane,6> planes;

    // Build frustum from a combined projection-view matrix (row-major 4x4)
    void setFromProjectionView(const std::array<float,16>& m);

    // AABB intersection test (min/max in world space)
    bool intersectsAABB(const cortex::utils::Vec3& min, const cortex::utils::Vec3& max) const;
};

} // namespace cortex::scene
