#pragma once

#include <string>

// Run a whitelisted command and return a JSON result string.
std::string run_command_lib(const std::string &cmd, bool dry_run=true, int timeout_seconds=60);
