#pragma once

#include <string>
#include <vector>
#include <unordered_map>

namespace cortex::animation {

struct State {
    std::string name;
    int clipIndex = -1;
    float speed = 1.0f;
};

struct Transition {
    int from = -1;
    int to = -1;
    float duration = 0.25f;
};

class AnimStateMachine {
public:
    int addState(const State& s);
    void addTransition(const Transition& t);
    void update(float dt);

private:
    std::vector<State> states_;
    std::vector<Transition> transitions_;
    int current_ = -1;
    float timer_ = 0.0f;
};

} // namespace cortex::animation
