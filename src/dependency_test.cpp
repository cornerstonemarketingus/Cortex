#include <iostream>
#include <vulkan/vulkan.h>
#include <GLFW/glfw3.h>
#include <glm/glm.hpp>
#include <btBulletDynamicsCommon.h>

int main() {
    // Simple compile-time dependency test. Runtime calls minimal GLFW init.
    if (!glfwInit()) {
        std::cerr << "GLFW init failed" << std::endl;
        return -1;
    }
    const char* ver = glfwGetVersionString();
    std::cout << "GLFW version: " << (ver ? ver : "unknown") << std::endl;
    glfwTerminate();

#ifdef VK_HEADER_VERSION
    std::cout << "Vulkan header version macro: " << VK_HEADER_VERSION << std::endl;
#endif

    // Use a glm type to ensure header compiles
    glm::vec3 v(1.0f);
    (void)v;

    // Bullet types included to validate compile
    btVector3 b(0,1,0);
    (void)b;

    std::cout << "Dependency test compiled and ran." << std::endl;
    return 0;
}
