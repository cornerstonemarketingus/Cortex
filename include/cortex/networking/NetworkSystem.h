#pragma once

#include "../../ecs/System.h"
#include <string>
#include <thread>
#include <mutex>
#include <vector>
#include <atomic>
#include <cstdint>

namespace cortex { namespace ecs { class ECSWorld; } }

namespace cortex::networking {

class NetworkSystem : public cortex::ecs::System {
public:
    NetworkSystem();
    ~NetworkSystem();

    // Initialize as authoritative server
    bool initServer(uint16_t port);
    // Initialize as client connecting to server
    bool initClient(const std::string& host, uint16_t port);

    void shutdown();

    // Tick the networking system (process incoming packets, interpolate, send snapshots)
    void tick(cortex::ecs::ECSWorld& world, float dt) override;

    // Send a state snapshot to peers (authoritative server will send authoritative state)
    void sendSnapshot();

    void setAuthority(bool server) { isServer_ = server; }

private:
    void recvThreadMain();

    std::atomic<bool> running_ = false;
    std::atomic<bool> isServer_ = false;
    std::thread recvThread_;
    std::mutex mutex_;
    std::vector<char> recvBuffer_;

    // placeholder for connection handles (platform-specific or library-backed)
    // when integrating ENet/Asio/websockets, replace these with proper types
    struct Connection { int id; std::string addr; uint16_t port; };
    std::vector<Connection> peers_;
};

} // namespace cortex::networking
