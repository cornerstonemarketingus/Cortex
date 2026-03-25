#pragma once

#include <vector>
#include <array>
#include <cstdint>

namespace cortex::animation {

struct Keyframe {
    float time;
    std::array<float,16> transform; // 4x4 matrix
};

struct BoneTrack {
    uint16_t boneIndex;
    std::vector<Keyframe> keys;
};

struct AnimationClip {
    std::string name;
    float duration = 0.0f;
    std::vector<BoneTrack> tracks;
};

} // namespace cortex::animation
