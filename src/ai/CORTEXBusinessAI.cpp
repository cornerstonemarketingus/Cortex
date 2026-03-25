#include "../../include/cortex/ai/CORTEXBusinessAI.h"
#include <iostream>

using namespace cortex::ai;

CORTEXBusinessAI::CORTEXBusinessAI() {}
CORTEXBusinessAI::~CORTEXBusinessAI() {}

bool CORTEXBusinessAI::init(const std::string& configPath) {
    configPath_ = configPath;
    std::cerr << "CORTEXBusinessAI: init stub with config " << configPath << std::endl;
    return true;
}

void CORTEXBusinessAI::run(float dt) {
    (void)dt; // placeholder: run scheduled tasks
}

std::vector<std::string> CORTEXBusinessAI::generateLeads(const std::string& prompt, int max) {
    std::vector<std::string> out;
    for (int i=0;i<max;i++) out.push_back(prompt + " - lead " + std::to_string(i+1));
    return out;
}

std::string CORTEXBusinessAI::generateMarketingCopy(const std::string& brief) {
    return std::string("Marketing: ") + brief;
}
