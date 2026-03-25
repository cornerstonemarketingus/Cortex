#pragma once

#include <string>
#include <thread>
#include <queue>
#include <mutex>
#include <condition_variable>
#include <functional>
#include <unordered_map>

namespace cortex::utils {

class AssetStreamer {
public:
    using Callback = std::function<void(const std::string&, const std::vector<char>&)>;

    AssetStreamer();
    ~AssetStreamer();

    void start();
    void stop();

    // Request load; callback invoked on load completion (on IO thread)
    void loadAsync(const std::string& path, Callback cb);

    // Poll completed loads from main thread if needed
    void poll();

private:
    void threadMain();

    struct Request { std::string path; Callback cb; };
    std::thread thread_;
    std::queue<Request> queue_;
    std::mutex mutex_;
    std::condition_variable cv_;
    bool running_ = false;

    // simple cache
    std::unordered_map<std::string, std::vector<char>> cache_;
};

} // namespace cortex::utils
