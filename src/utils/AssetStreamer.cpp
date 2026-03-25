#include "../../include/cortex/utils/AssetStreamer.h"
#include <fstream>
#include <iostream>

using namespace cortex::utils;

AssetStreamer::AssetStreamer() {}
AssetStreamer::~AssetStreamer() { stop(); }

void AssetStreamer::start() {
    running_ = true;
    thread_ = std::thread(&AssetStreamer::threadMain, this);
}

void AssetStreamer::stop() {
    {
        std::lock_guard<std::mutex> lk(mutex_);
        running_ = false;
        cv_.notify_all();
    }
    if (thread_.joinable()) thread_.join();
}

void AssetStreamer::loadAsync(const std::string& path, Callback cb) {
    {
        std::lock_guard<std::mutex> lk(mutex_);
        queue_.push({path, cb});
        cv_.notify_one();
    }
}

void AssetStreamer::poll() {
    // No-op for now: callbacks happen on IO thread. Could queue results for main thread.
}

void AssetStreamer::threadMain() {
    while (true) {
        Request req;
        {
            std::unique_lock<std::mutex> lk(mutex_);
            cv_.wait(lk, [this]{ return !queue_.empty() || !running_; });
            if (!running_ && queue_.empty()) break;
            req = queue_.front(); queue_.pop();
        }
        // load file
        std::vector<char> data;
        std::ifstream ifs(req.path, std::ios::binary);
        if (ifs) {
            ifs.seekg(0, std::ios::end); size_t sz = (size_t)ifs.tellg(); ifs.seekg(0);
            data.resize(sz);
            ifs.read(data.data(), (std::streamsize)sz);
        }
        try {
            req.cb(req.path, data);
        } catch (...) {
            std::cerr << "AssetStreamer: callback threw for " << req.path << std::endl;
        }
    }
}
