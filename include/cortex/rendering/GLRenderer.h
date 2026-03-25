#pragma once

#include "Renderer.h"

namespace cortex { namespace rendering {

class GLRenderer : public Renderer {
public:
    GLRenderer();
    ~GLRenderer();
    bool init() override;
    void shutdown() override;
    void draw(const SceneGraph& scene) override;
};

} }
