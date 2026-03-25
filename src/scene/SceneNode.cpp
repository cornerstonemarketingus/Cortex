#include "../../include/cortex/scene/SceneNode.h"
#include <cmath>

using namespace cortex::scene;
using cortex::utils::Vec3;

static void multiplyMatrix(const std::array<float,16>& a, const std::array<float,16>& b, std::array<float,16>& out) {
    for (int r=0;r<4;++r) for (int c=0;c<4;++c) {
        float v=0.0f;
        for (int k=0;k<4;++k) v += a[r*4 + k] * b[k*4 + c];
        out[r*4 + c] = v;
    }
}

void SceneNode::markDirty() {
    if (dirty) return;
    dirty = true;
}

void SceneNode::updateLocalMatrix() {
    // Simple TRS into a row-major 4x4
    float cx = std::cos(rotation.x), sx = std::sin(rotation.x);
    float cy = std::cos(rotation.y), sy = std::sin(rotation.y);
    float cz = std::cos(rotation.z), sz = std::sin(rotation.z);

    // Rotation Z * Y * X
    std::array<float,16> rot{};
    rot[0] = cz*cy; rot[1] = cz*sy*sx - sz*cx; rot[2] = cz*sy*cx + sz*sx; rot[3]=0;
    rot[4] = sz*cy; rot[5] = sz*sy*sx + cz*cx; rot[6] = sz*sy*cx - cz*sx; rot[7]=0;
    rot[8] = -sy;   rot[9] = cy*sx;               rot[10]=cy*cx;              rot[11]=0;
    rot[12]=0; rot[13]=0; rot[14]=0; rot[15]=1;

    // Scale
    std::array<float,16> scale{};
    scale[0] = this->scale.x; scale[5] = this->scale.y; scale[10] = this->scale.z; scale[15]=1;

    // TRS: R * S then set translation in the resulting matrix
    std::array<float,16> rs{};
    multiplyMatrix(rot, scale, rs);
    rs[12] = position.x; rs[13] = position.y; rs[14] = position.z; rs[15]=1.0f;
    localMatrix = rs;
}
