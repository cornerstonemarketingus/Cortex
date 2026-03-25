#ifdef BUILD_PYBIND
#include <pybind11/pybind11.h>
#include <string>
#include "agent_bridge_lib.h"

namespace py = pybind11;

PYBIND11_MODULE(ai_bridge, m) {
    m.doc() = "CORTEX ai bridge module";
    m.def("run_command", [](const std::string &cmd, bool dry_run, int timeout){
        std::string res = run_command_lib(cmd, dry_run, timeout);
        return res;
    }, "Run a whitelisted command", py::arg("cmd"), py::arg("dry_run")=true, py::arg("timeout")=60);
}
#endif
