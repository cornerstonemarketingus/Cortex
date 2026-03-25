#pragma once

#include "../../ecs/System.h"
#include "Skeleton.h"
#include "AnimationClip.h"
#include "AnimStateMachine.h"
#include <vector>

namespace cortex::animation {

class AnimSystem : public cortex::ecs::System {
public:
    void tick(cortex::ecs::ECSWorld& world, float dt) override;

    // register skeleton and clips per entity
    void attachSkeleton(int entityId, const Skeleton& skel, const std::vector<AnimationClip>& clips);

private:
    struct Instance {
        int entityId;
        Skeleton skeleton;
        std::vector<AnimationClip> clips;
        AnimStateMachine sm;
        std::vector<std::array<float,16>> poseMatrices; // final skin matrices
    };

    std::vector<Instance> instances_;
};

