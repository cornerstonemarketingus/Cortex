#include "../../include/cortex/ecs/Registry.h"
#include <typeindex>
#include <iostream>

using namespace cortex::ecs;

EntityId Registry::createEntity() {
    return nextId_++;
}

void Registry::destroyEntity(EntityId id) {
    for (auto &kv : components_) {
        kv.second.erase(id);
    }
}

// Template implementations need to be in header; provide minimal inline helpers

extern "C" void cortex_ecs_registry_dummy() {}
