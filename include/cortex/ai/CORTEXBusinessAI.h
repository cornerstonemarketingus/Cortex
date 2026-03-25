#pragma once

#include <string>
#include <vector>
#include <memory>

namespace cortex::ai {

class CORTEXBusinessAI {
public:
    CORTEXBusinessAI();
    ~CORTEXBusinessAI();

    // Initialize AI (load models, heuristics) -- placeholder
    bool init(const std::string& configPath = "");

    // Run one tick of the AI subsystem (can queue tasks, generate content)
    void run(float dt);

    // Example tasks
    std::vector<std::string> generateLeads(const std::string& prompt, int max);
    std::string generateMarketingCopy(const std::string& brief);

private:
    // internal state and caches
    std::string configPath_;
};

} // namespace cortex::ai
