#pragma once

#include <cstdint>

namespace cortex::ecs {

using EntityId = uint32_t;

struct Entity {
  EntityId id;
};

}
