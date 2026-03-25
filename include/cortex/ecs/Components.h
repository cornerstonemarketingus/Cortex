#pragma once

#include "Component.h"
#include "../utils/Math.h"

namespace cortex::ecs {

struct VelocityComponent : public IComponent {
    cortex::utils::Vec3 velocity{0,0,0};
    VelocityComponent() = default;
    VelocityComponent(const cortex::utils::Vec3& v): velocity(v) {}
};

struct MeshComponent : public IComponent {
    int meshId = -1;
};

struct RigidBodyComponent : public IComponent {
    // placeholder for physics body handle
    void* body = nullptr;
};

} // namespace cortex::ecs
