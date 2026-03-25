#include "../../include/cortex/networking/NetworkSystem.h"
#include <iostream>

using namespace cortex::networking;
using namespace std::chrono_literals;

NetworkSystem::NetworkSystem() {}
NetworkSystem::~NetworkSystem() { shutdown(); }

bool NetworkSystem::initServer(uint16_t port) {
    // TODO: initialize UDP socket or ENet host here
    std::cerr << "NetworkSystem: initServer stub on port " << port << std::endl;
    isServer_ = true;
    running_ = true;
    recvThread_ = std::thread(&NetworkSystem::recvThreadMain, this);
    return true;
}

bool NetworkSystem::initClient(const std::string& host, uint16_t port) {
    // TODO: initialize client socket and connect
    std::cerr << "NetworkSystem: initClient stub to " << host << ":" << port << std::endl;
    isServer_ = false;
    running_ = true;
    recvThread_ = std::thread(&NetworkSystem::recvThreadMain, this);
    return true;
}

void NetworkSystem::shutdown() {
    running_ = false;
    if (recvThread_.joinable()) recvThread_.join();
}

void NetworkSystem::tick(cortex::ecs::ECSWorld& world, float dt) {
    (void)world; (void)dt;
    // Process received packets (placeholder)
}

void NetworkSystem::sendSnapshot() {
    // Serialize entity states and send to peers
}

void NetworkSystem::recvThreadMain() {
    while (running_) {
        // placeholder loop; real implementation would block on socket recv
        std::this_thread::sleep_for(5ms);
    }
}
