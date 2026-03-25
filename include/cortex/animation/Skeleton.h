#pragma once

#include <vector>
#include <string>
#include <array>
#include <cstdint>
#include "../utils/Math.h"

namespace cortex::animation {

using BoneIndex = uint16_t;

struct Bone {
    std::string name;
    BoneIndex parent = (BoneIndex)-1;
    std::array<float,16> inverseBindMatrix{};
};

struct Skeleton {
    std::vector<Bone> bones;
    size_t numBones() const { return bones.size(); }
};

} // namespace cortex::animation
