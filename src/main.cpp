#include <iostream>
#include <stdexcept>
#include <vulkan/vulkan.h>
#include <GLFW/glfw3.h>

int main() {
    if (!glfwInit()) {
        std::cerr << "GLFW init failed" << std::endl;
        return -1;
    }

    glfwWindowHint(GLFW_CLIENT_API, GLFW_NO_API);
    GLFWwindow* window = glfwCreateWindow(800, 600, "CORTEXEngine", nullptr, nullptr);
    if (!window) {
        std::cerr << "Failed to create GLFW window" << std::endl;
        glfwTerminate();
        return -1;
    }

    if (!glfwVulkanSupported()) {
        std::cerr << "GLFW reports Vulkan not supported on this machine" << std::endl;
        // continue to attempt a vkCreateInstance for diagnostics
    }

    VkApplicationInfo appInfo{};
    appInfo.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO;
    appInfo.pApplicationName = "CORTEXEngine";
    appInfo.applicationVersion = VK_MAKE_VERSION(0,1,0);
    appInfo.pEngineName = "CORTEXEngine";
    appInfo.engineVersion = VK_MAKE_VERSION(0,1,0);
    appInfo.apiVersion = VK_API_VERSION_1_0;

    VkInstanceCreateInfo createInfo{};
    createInfo.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
    createInfo.pApplicationInfo = &appInfo;

    VkInstance instance = VK_NULL_HANDLE;
    VkResult res = vkCreateInstance(&createInfo, nullptr, &instance);
    if (res != VK_SUCCESS) {
        std::cerr << "vkCreateInstance failed: " << res << std::endl;
        glfwDestroyWindow(window);
        glfwTerminate();
        return -1;
    }

    std::cout << "CORTEX engine started successfully (window created, Vulkan instance created)" << std::endl;

    // Clean up
    vkDestroyInstance(instance, nullptr);
    glfwDestroyWindow(window);
    glfwTerminate();
    return 0;
}
