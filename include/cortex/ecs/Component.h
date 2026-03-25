#pragma once

namespace cortex::ecs {

struct IComponent {
  virtual ~IComponent() = default;
};

}
