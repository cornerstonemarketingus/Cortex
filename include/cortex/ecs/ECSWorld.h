#pragma once

#include <cstdint>
#include <unordered_map>
#include <unordered_set>
#include <typeindex>
#include <memory>
#include <vector>
#include <functional>
#include "Entity.h"
#include "Component.h"
#include "System.h"
#include "../utils/Math.h"
#include "TransformSoA.h"

namespace cortex::ecs {

class ECSWorld {
public:
    using EntityId = EntityId;
    ECSWorld();

    EntityId createEntity();
    void destroyEntity(EntityId id);

    // Tick the world: update systems and internal modules
    void tick(float dt);

    // Component helpers (generic storage for non-SoA components)
    template<typename Comp, typename... Args>
    Comp& addComponent(EntityId id, Args&&... args) {
        auto &map = components_[std::type_index(typeid(Comp))];
        auto comp = std::make_unique<Comp>(std::forward<Args>(args)...);
        Comp* raw = comp.get();
        map.emplace(id, std::move(comp));
        return *raw;
    }

    template<typename Comp>
    Comp* getComponent(EntityId id) {
        auto it = components_.find(std::type_index(typeid(Comp)));
        if (it == components_.end()) return nullptr;
        auto it2 = it->second.find(id);
        if (it2 == it->second.end()) return nullptr;
        return static_cast<Comp*>(it2->second.get());
    }

    // Systems
    void registerSystem(std::shared_ptr<System> sys);

    // Access specialized SoA transform store
    TransformSoA& transforms() { return transformStore_; }

private:
    EntityId nextId_ = 1;
    std::unordered_set<EntityId> alive_;

    // generic component storage: type -> (entity -> unique_ptr<IComponent>)
    std::unordered_map<std::type_index, std::unordered_map<EntityId, std::unique_ptr<IComponent>>> components_;

    // SoA store for transforms (SIMD-friendly)
    TransformSoA transformStore_;

    std::vector<std::shared_ptr<System>> systems_;
};

} // namespace cortex::ecs
