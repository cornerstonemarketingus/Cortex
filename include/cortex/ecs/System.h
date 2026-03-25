#pragma once

#include <memory>

namespace cortex { namespace ecs {

class ECSWorld;

class System {
public:
    virtual ~System() = default;
    virtual void tick(ECSWorld& world, float dt) = 0;
};

} }
