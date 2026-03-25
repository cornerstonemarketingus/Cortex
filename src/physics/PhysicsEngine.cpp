#include "../../include/cortex/physics/PhysicsEngine.h"
#include <iostream>

using namespace cortex::physics;
using cortex::utils::Vec3;

PhysicsEngine::PhysicsEngine() {}
PhysicsEngine::~PhysicsEngine() { shutdown(); }

#ifdef USE_BULLET
#include <btBulletDynamicsCommon.h>

struct PhysicsEngine::BulletImpl {
    btDefaultCollisionConfiguration* collisionConfig = nullptr;
    btCollisionDispatcher* dispatcher = nullptr;
    btBroadphaseInterface* broadphase = nullptr;
    btSequentialImpulseConstraintSolver* solver = nullptr;
    btDiscreteDynamicsWorld* world = nullptr;

    std::vector<std::unique_ptr<btCollisionShape>> shapes;
    std::vector<std::unique_ptr<btRigidBody>> bodies;
    std::vector<std::unique_ptr<btMotionState>> motions;

    BulletImpl() {
        collisionConfig = new btDefaultCollisionConfiguration();
        dispatcher = new btCollisionDispatcher(collisionConfig);
        broadphase = new btDbvtBroadphase();
        solver = new btSequentialImpulseConstraintSolver();
        world = new btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfig);
        world->setGravity(btVector3(0, -9.81f, 0));
    }

    ~BulletImpl() {
        if (world) {
            // remove bodies
            for (auto &b : bodies) {
                if (b) world->removeRigidBody(b.get());
            }
        }
        bodies.clear();
        shapes.clear();
        motions.clear();
        delete world; delete solver; delete broadphase; delete dispatcher; delete collisionConfig;
    }

    void stepSimulation(float dt) {
        if (world) world->stepSimulation(dt, 10);
    }

    int addBox(const Vec3& halfExtents, float mass, const Vec3& pos) {
        auto shape = std::make_unique<btBoxShape>(btVector3(halfExtents.x, halfExtents.y, halfExtents.z));
        btTransform t; t.setIdentity(); t.setOrigin(btVector3(pos.x, pos.y, pos.z));
        auto motion = std::make_unique<btDefaultMotionState>(t);
        btVector3 inertia(0,0,0);
        if (mass != 0.0f) shape->calculateLocalInertia(mass, inertia);
        btRigidBody::btRigidBodyConstructionInfo info(mass, motion.get(), shape.get(), inertia);
        auto body = std::make_unique<btRigidBody>(info);
        // add to world after ownership stored to keep stable pointers
        shapes.push_back(std::move(shape));
        motions.push_back(std::move(motion));
        bodies.push_back(std::move(body));
        size_t idx = bodies.size()-1;
        bodies[idx]->setUserIndex((int)idx);
        world->addRigidBody(bodies[idx].get());
        return (int)idx;
    }

    int addSphere(float radius, float mass, const Vec3& pos) {
        auto shape = std::make_unique<btSphereShape>(radius);
        btTransform t; t.setIdentity(); t.setOrigin(btVector3(pos.x, pos.y, pos.z));
        auto motion = std::make_unique<btDefaultMotionState>(t);
        btVector3 inertia(0,0,0);
        if (mass != 0.0f) shape->calculateLocalInertia(mass, inertia);
        btRigidBody::btRigidBodyConstructionInfo info(mass, motion.get(), shape.get(), inertia);
        auto body = std::make_unique<btRigidBody>(info);
        shapes.push_back(std::move(shape));
        motions.push_back(std::move(motion));
        bodies.push_back(std::move(body));
        size_t idx = bodies.size()-1;
        bodies[idx]->setUserIndex((int)idx);
        world->addRigidBody(bodies[idx].get());
        return (int)idx;
    }

    int addCapsule(float radius, float height, float mass, const Vec3& pos) {
        auto shape = std::make_unique<btCapsuleShape>(radius, height);
        btTransform t; t.setIdentity(); t.setOrigin(btVector3(pos.x, pos.y, pos.z));
        auto motion = std::make_unique<btDefaultMotionState>(t);
        btVector3 inertia(0,0,0);
        if (mass != 0.0f) shape->calculateLocalInertia(mass, inertia);
        btRigidBody::btRigidBodyConstructionInfo info(mass, motion.get(), shape.get(), inertia);
        auto body = std::make_unique<btRigidBody>(info);
        shapes.push_back(std::move(shape));
        motions.push_back(std::move(motion));
        bodies.push_back(std::move(body));
        size_t idx = bodies.size()-1;
        bodies[idx]->setUserIndex((int)idx);
        world->addRigidBody(bodies[idx].get());
        return (int)idx;
    }

    size_t bodyIndex() const { return bodies.size() ? bodies.size()-1 : 0; }

    std::optional<RaycastHit> raycast(const Vec3& from, const Vec3& to) const {
        if (!world) return std::nullopt;
        btVector3 btFrom(from.x, from.y, from.z);
        btVector3 btTo(to.x, to.y, to.z);
        btCollisionWorld::ClosestRayResultCallback cb(btFrom, btTo);
        world->rayTest(btFrom, btTo, cb);
        if (cb.hasHit()) {
            RaycastHit h;
            h.point = Vec3{cb.m_hitPointWorld.x(), cb.m_hitPointWorld.y(), cb.m_hitPointWorld.z()};
            h.normal = Vec3{cb.m_hitNormalWorld.x(), cb.m_hitNormalWorld.y(), cb.m_hitNormalWorld.z()};
            h.distance = (h.point - from).length();
            h.bodyId = (int)cb.m_collisionObject->getUserIndex();
            return h;
        }
        return std::nullopt;
    }
};
#endif

bool PhysicsEngine::init() {
#ifdef USE_BULLET
    try {
        impl_ = std::make_unique<BulletImpl>();
        initialized_ = true;
        return true;
    } catch (const std::exception &e) {
        std::cerr << "Bullet init failed: " << e.what() << std::endl;
        initialized_ = false;
        return false;
    }
#else
    std::cerr << "PhysicsEngine: Bullet not enabled. Running in no-physics fallback mode." << std::endl;
    initialized_ = false;
    return false;
#endif
}

void PhysicsEngine::shutdown() {
#ifdef USE_BULLET
    impl_.reset();
    initialized_ = false;
#else
    bodies_.clear();
    initialized_ = false;
#endif
}

void PhysicsEngine::step(float dt) {
#ifdef USE_BULLET
    if (impl_) impl_->stepSimulation(dt);
#else
    (void)dt;
#endif
}

int PhysicsEngine::createBox(const Vec3& halfExtents, float mass, const Vec3& position) {
#ifdef USE_BULLET
    if (!impl_) return -1;
    return impl_->addBox(halfExtents, mass, position);
#else
    int id = (int)bodies_.size();
    Body b; b.id = id; b.native = nullptr;
    bodies_.push_back(b);
    return id;
#endif
}

int PhysicsEngine::createSphere(float radius, float mass, const Vec3& position) {
#ifdef USE_BULLET
    if (!impl_) return -1;
    return impl_->addSphere(radius, mass, position);
#else
    int id = (int)bodies_.size();
    Body b; b.id = id; b.native = nullptr;
    bodies_.push_back(b);
    return id;
#endif
}

int PhysicsEngine::createCapsule(float radius, float height, float mass, const Vec3& position) {
#ifdef USE_BULLET
    if (!impl_) return -1;
    return impl_->addCapsule(radius, height, mass, position);
#else
    int id = (int)bodies_.size();
    Body b; b.id = id; b.native = nullptr;
    bodies_.push_back(b);
    return id;
#endif
}

void PhysicsEngine::removeBody(int id) {
#ifdef USE_BULLET
    // not implemented: removing body would require tracking and removing from world
    (void)id;
#else
    for (auto it = bodies_.begin(); it != bodies_.end(); ++it) {
        if (it->id == id) { bodies_.erase(it); return; }
    }
#endif
}

int PhysicsEngine::createCharacterController(float height, float radius, const Vec3& position) {
#ifdef USE_BULLET
    // Character controller integration not implemented in this stub
    (void)height; (void)radius; (void)position;
    return -1;
#else
    int id = (int)bodies_.size();
    Body b; b.id = id; b.native = nullptr;
    bodies_.push_back(b);
    return id;
#endif
}

std::optional<RaycastHit> PhysicsEngine::raycast(const Vec3& from, const Vec3& to) const {
#ifdef USE_BULLET
    if (!impl_) return std::nullopt;
    return impl_->raycast(from, to);
#else
    (void)from; (void)to;
    return std::nullopt;
#endif
}
