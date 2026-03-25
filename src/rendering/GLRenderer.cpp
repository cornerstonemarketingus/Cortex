#include "../../include/cortex/rendering/GLRenderer.h"
#include <iostream>

using namespace cortex::rendering;

GLRenderer::GLRenderer() {}
GLRenderer::~GLRenderer() { shutdown(); }

bool GLRenderer::init() {
    std::cerr << "GLRenderer: init stub (OpenGL context required)" << std::endl;
    return false;
}

void GLRenderer::shutdown() {
}

void GLRenderer::draw(const SceneGraph& scene) {
    (void)scene;
}

std::unique_ptr<Renderer> cortex::rendering::createGLRenderer() { return std::make_unique<GLRenderer>(); }
