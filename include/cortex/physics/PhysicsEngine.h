#pragma once

#include <vector>
#include <memory>
#include <optional>
#include <cstdint>
#include "../utils/Math.h"

namespace cortex::physics {

struct RaycastHit {
    int bodyId = -1;
    cortex::utils::Vec3 point{0,0,0};
    cortex::utils::Vec3 normal{0,0,0};
    float distance = 0.0f;
};

class PhysicsEngine {
public:
    PhysicsEngine();
    ~PhysicsEngine();

    bool init();
    void shutdown();
    void step(float dt);

    // Rigid body creation: return opaque id (>=0) or -1 on failure
    int createBox(const cortex::utils::Vec3& halfExtents, float mass, const cortex::utils::Vec3& position);
    int createSphere(float radius, float mass, const cortex::utils::Vec3& position);
    int createCapsule(float radius, float height, float mass, const cortex::utils::Vec3& position);

    void removeBody(int id);

    // Character controller stub
    int createCharacterController(float height, float radius, const cortex::utils::Vec3& position);

    std::optional<RaycastHit> raycast(const cortex::utils::Vec3& from, const cortex::utils::Vec3& to) const;

    bool isInitialized() const { return initialized_; }

private:
    bool initialized_ = false;

    // Opaque handles when Bullet is available; otherwise simple fallback storage
    struct Body { int id; void* native = nullptr; };
    std::vector<Body> bodies_;

#ifdef USE_BULLET
    // Bullet-specific pointers
    struct BulletImpl;
    std::unique_ptr<BulletImpl> impl_;
#endif
};

} // namespace cortex::physics
