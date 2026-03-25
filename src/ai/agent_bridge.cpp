// Minimal Agent Bridge CLI
// Reads command-line arguments and executes whitelisted commands, returning a simple JSON result to stdout.
// Usage: agent_bridge --exec "git status" --dry-run

#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <cstdlib>
#include <array>

#ifdef _WIN32
#include <windows.h>
#endif

static const std::vector<std::string> WHITELIST = {
    "git", "cmake", "cmake.exe", "python", "pip", "powershell", "pwsh", "npm", "cargo"
};

std::string escape_json(const std::string &s) {
    std::string out;
    for (char c : s) {
        switch (c) {
            case '"': out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\b': out += "\\b"; break;
            case '\f': out += "\\f"; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default: out += c; break;
        }
    }
    return out;
}

int run_command_capture(const std::string &cmd, std::string &out, std::string &err) {
#ifdef _WIN32
    // Use _popen for simplicity; note this only captures stdout.
    FILE* pipe = _popen(cmd.c_str(), "r");
    if (!pipe) return -1;
    char buffer[256];
    while (fgets(buffer, sizeof(buffer), pipe)) {
        out += buffer;
    }
    int rc = _pclose(pipe);
    return rc;
#else
    std::array<char, 256> buffer;
    out.clear();
    FILE* pipe = popen(cmd.c_str(), "r");
    if (!pipe) return -1;
    while (fgets(buffer.data(), buffer.size(), pipe) != nullptr) {
        out += buffer.data();
    }
    int rc = pclose(pipe);
    return rc;
#endif
}

bool is_whitelisted(const std::string &exe) {
    std::string base = exe;
    // extract base name
    auto pos = base.find_last_of("/\\");
    if (pos != std::string::npos) base = base.substr(pos + 1);
    for (auto &w : WHITELIST) if (base == w) return true;
    return false;
}

int main(int argc, char** argv) {
    bool do_exec = false;
    std::string cmd;
    bool dry_run = true;

    for (int i=1;i<argc;i++) {
        std::string a = argv[i];
        if (a == "--exec" && i+1<argc) { do_exec = true; cmd = argv[++i]; }
        else if (a == "--dry-run") { dry_run = true; }
        else if (a == "--no-dry-run") { dry_run = false; }
    }

    if (!do_exec) {
        std::cout << "{\"ok\":false,\"error\":\"no command specified\"}" << std::endl;
        return 1;
    }

    // naive parse of executable
    std::string exe = cmd;
    auto sp = exe.find(' ');
    if (sp != std::string::npos) exe = exe.substr(0, sp);

    if (!is_whitelisted(exe)) {
        std::string resp = "{\"ok\":false,\"error\":\"not whitelisted\"}";
        std::cout << resp << std::endl;
        return 1;
    }

    if (dry_run) {
        std::string resp = "{\"ok\":true,\"dry_run\":true,\"cmd\":\"" + escape_json(cmd) + "\"}";
        std::cout << resp << std::endl;
        return 0;
    }

    std::string out, err;
    int rc = run_command_capture(cmd, out, err);
    std::string resp = "{\"ok\":true,\"rc\":" + std::to_string(rc) + ",\"stdout\":\"" + escape_json(out) + "\",\"stderr\":\"" + escape_json(err) + "\"}";
    std::cout << resp << std::endl;
    return 0;
}
