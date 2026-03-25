#include "../../include/cortex/rendering/VulkanRenderer.h"
#include <iostream>
#ifdef USE_VULKAN
#include <vulkan/vulkan.h>
#endif

using namespace cortex::rendering;

VulkanRenderer::VulkanRenderer() {}
VulkanRenderer::~VulkanRenderer() { shutdown(); }

bool VulkanRenderer::init() {
#ifdef USE_VULKAN
    std::cerr << "VulkanRenderer: attempting to init Vulkan instance" << std::endl;
    VkInstance instance = VK_NULL_HANDLE;
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

    VkResult res = vkCreateInstance(&createInfo, nullptr, &instance);
    if (res != VK_SUCCESS) {
        std::cerr << "VulkanRenderer: vkCreateInstance failed: " << res << std::endl;
        return false;
    }
    // store instance in a private member if needed (omitted here)
    std::cerr << "VulkanRenderer: Vulkan instance created" << std::endl;
    return true;
#else
    std::cerr << "VulkanRenderer: compiled without USE_VULKAN" << std::endl;
    return false;
#endif
}

void VulkanRenderer::shutdown() {
#ifdef USE_VULKAN
    // destroy instance if stored
#endif
}

void VulkanRenderer::draw(const SceneGraph& scene) {
    (void)scene;
}

std::unique_ptr<Renderer> cortex::rendering::createVulkanRenderer() { return std::make_unique<VulkanRenderer>(); }
