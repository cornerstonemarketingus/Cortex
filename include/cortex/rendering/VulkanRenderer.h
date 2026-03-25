#pragma once

#include "Renderer.h"

namespace cortex { namespace rendering {

class VulkanRenderer : public Renderer {
public:
    VulkanRenderer();
    ~VulkanRenderer();
    bool init() override;
    void shutdown() override;
    void draw(const SceneGraph& scene) override;
};

} }
