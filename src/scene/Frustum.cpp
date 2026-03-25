#include "../../include/cortex/scene/Frustum.h"
#include <cmath>

using namespace cortex::scene;
using cortex::utils::Vec3;

void Frustum::setFromProjectionView(const std::array<float,16>& m) {
    // rows
    float r0[4] = { m[0], m[1], m[2], m[3] };
    float r1[4] = { m[4], m[5], m[6], m[7] };
    float r2[4] = { m[8], m[9], m[10], m[11] };
    float r3[4] = { m[12], m[13], m[14], m[15] };

    // left  = r3 + r0
    planes[0].a = r3[0] + r0[0]; planes[0].b = r3[1] + r0[1]; planes[0].c = r3[2] + r0[2]; planes[0].d = r3[3] + r0[3];
    // right = r3 - r0
    planes[1].a = r3[0] - r0[0]; planes[1].b = r3[1] - r0[1]; planes[1].c = r3[2] - r0[2]; planes[1].d = r3[3] - r0[3];
    // top   = r3 - r1
    planes[2].a = r3[0] - r1[0]; planes[2].b = r3[1] - r1[1]; planes[2].c = r3[2] - r1[2]; planes[2].d = r3[3] - r1[3];
    // bottom= r3 + r1
    planes[3].a = r3[0] + r1[0]; planes[3].b = r3[1] + r1[1]; planes[3].c = r3[2] + r1[2]; planes[3].d = r3[3] + r1[3];
    // near  = r3 + r2
    planes[4].a = r3[0] + r2[0]; planes[4].b = r3[1] + r2[1]; planes[4].c = r3[2] + r2[2]; planes[4].d = r3[3] + r2[3];
    // far   = r3 - r2
    planes[5].a = r3[0] - r2[0]; planes[5].b = r3[1] - r2[1]; planes[5].c = r3[2] - r2[2]; planes[5].d = r3[3] - r2[3];

    // Normalize planes
    for (int i = 0; i < 6; ++i) {
        float a = planes[i].a, b = planes[i].b, c = planes[i].c;
        float len = std::sqrt(a*a + b*b + c*c);
        if (len > 1e-6f) {
            planes[i].a /= len; planes[i].b /= len; planes[i].c /= len; planes[i].d /= len;
        }
    }
}

bool Frustum::intersectsAABB(const Vec3& min, const Vec3& max) const {
    // For each plane, compute the positive vertex and test
    for (int i = 0; i < 6; ++i) {
        const Plane &p = planes[i];
        Vec3 positive;
        positive.x = p.a >= 0 ? max.x : min.x;
        positive.y = p.b >= 0 ? max.y : min.y;
        positive.z = p.c >= 0 ? max.z : min.z;
        float dist = p.a * positive.x + p.b * positive.y + p.c * positive.z + p.d;
        if (dist < 0) return false; // outside
    }
    return true;
}
