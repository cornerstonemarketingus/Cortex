#include "../../include/cortex/ecs/ECSWorld.h"
#include <algorithm>
#include <iostream>

using namespace cortex::ecs;

ECSWorld::ECSWorld() {}

ECSWorld::EntityId ECSWorld::createEntity() {
    EntityId id = nextId_++;
    alive_.insert(id);
    return id;
}

void ECSWorld::destroyEntity(EntityId id) {
    alive_.erase(id);
    // remove from generic components
    for (auto &kv : components_) kv.second.erase(id);
    // remove from transform store
    transformStore_.remove(id);
}

void ECSWorld::tick(float dt) {
    // Update systems
    for (auto &s : systems_) {
        s->tick(*this, dt);
    }
    // Example: simple transform SoA pass (no-op by default)
    transformStore_.forEach([dt](EntityId id, float &px, float &py, float &pz, float &sx, float &sy, float &sz){
        // placeholder: could apply velocity etc.
        (void)id; (void)dt; (void)px; (void)py; (void)pz; (void)sx; (void)sy; (void)sz;
    });
}

void ECSWorld::registerSystem(std::shared_ptr<System> sys) {
    systems_.push_back(sys);
}
