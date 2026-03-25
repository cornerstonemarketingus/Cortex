#pragma once

#include <unordered_map>
#include <vector>
#include <typeindex>
#include <memory>
#include "Entity.h"
#include "../utils/Math.h"

namespace cortex::ecs {

class Registry {
public:
    Registry() = default;

    EntityId createEntity();
    void destroyEntity(EntityId id);

    template<typename Comp, typename... Args>
    Comp& addComponent(EntityId id, Args&&... args);

    template<typename Comp>
    Comp* getComponent(EntityId id);

private:
    EntityId nextId_ = 1;
    std::unordered_map<std::type_index, std::unordered_map<EntityId, std::unique_ptr<void>>> components_;
};

}
