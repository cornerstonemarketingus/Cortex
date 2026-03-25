#include "../../include/cortex/animation/AnimSystem.h"
#include <algorithm>

using namespace cortex::animation;

void AnimSystem::tick(cortex::ecs::ECSWorld& world, float dt) {
    for (auto &inst : instances_) {
        inst.sm.update(dt);
        // Evaluate current clip into poseMatrices (placeholder)
        if (inst.poseMatrices.size() != inst.skeleton.numBones()) inst.poseMatrices.assign(inst.skeleton.numBones(), {});
        // For now copy inverse bind as identity-like placeholders
        for (size_t i=0;i<inst.poseMatrices.size();++i) inst.poseMatrices[i] = inst.skeleton.bones[i].inverseBindMatrix;
        // Upload to GPU or update skinning buffers when rendering is integrated
    }
}

void AnimSystem::attachSkeleton(int entityId, const Skeleton& skel, const std::vector<AnimationClip>& clips) {
    Instance inst;
    inst.entityId = entityId;
    inst.skeleton = skel;
    inst.clips = clips;
    inst.poseMatrices.assign(skel.numBones(), {});
    instances_.push_back(std::move(inst));
}
