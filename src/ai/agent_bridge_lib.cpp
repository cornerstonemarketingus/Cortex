#include "agent_bridge_lib.h"
#include <string>
#include <vector>
#include <chrono>
#include <thread>
#include <sstream>

#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#else
#include <sys/types.h>
#include <sys/wait.h>
#include <sys/select.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#endif

static const std::vector<std::string> WHITELIST = {
    "git", "cmake", "cmake.exe", "python", "pip", "powershell", "pwsh", "npm", "cargo"
};

static std::string escape_json(const std::string &s) {
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

static bool is_whitelisted(const std::string &exe) {
    std::string base = exe;
    auto pos = base.find_last_of("/\\");
    if (pos != std::string::npos) base = base.substr(pos + 1);
    for (auto &w : WHITELIST) if (base == w) return true;
    return false;
}

#ifdef _WIN32
static std::string read_pipe(HANDLE pipe) {
    std::string out;
    DWORD dwRead;
    CHAR buffer[4096];
    for (;;) {
        BOOL ok = ReadFile(pipe, buffer, sizeof(buffer)-1, &dwRead, nullptr);
        if (!ok || dwRead == 0) break;
        buffer[dwRead] = '\0';
        out.append(buffer, dwRead);
    }
    return out;
}

std::string run_command_lib(const std::string &cmd, bool dry_run, int timeout_seconds) {
    if (cmd.empty()) return "{\"ok\":false,\"error\":\"empty command\"}";
    std::string exe = cmd;
    auto sp = exe.find(' ');
    if (sp != std::string::npos) exe = exe.substr(0, sp);
    if (!is_whitelisted(exe)) return "{\"ok\":false,\"error\":\"not whitelisted\"}";
    if (dry_run) return "{\"ok\":true,\"dry_run\":true,\"cmd\":\"" + escape_json(cmd) + "\"}";

    SECURITY_ATTRIBUTES saAttr; 
    saAttr.nLength = sizeof(SECURITY_ATTRIBUTES); 
    saAttr.bInheritHandle = TRUE; 
    saAttr.lpSecurityDescriptor = NULL; 

    HANDLE hStdOutRead = NULL; 
    HANDLE hStdOutWrite = NULL; 
    HANDLE hStdErrRead = NULL; 
    HANDLE hStdErrWrite = NULL; 

    if (!CreatePipe(&hStdOutRead, &hStdOutWrite, &saAttr, 0)) return "{\"ok\":false,\"error\":\"pipe_failed\"}";
    if (!CreatePipe(&hStdErrRead, &hStdErrWrite, &saAttr, 0)) return "{\"ok\":false,\"error\":\"pipe_failed\"}";
    // Ensure read handles are not inherited
    SetHandleInformation(hStdOutRead, HANDLE_FLAG_INHERIT, 0);
    SetHandleInformation(hStdErrRead, HANDLE_FLAG_INHERIT, 0);

    PROCESS_INFORMATION piProcInfo; 
    STARTUPINFOA siStartInfo; 
    ZeroMemory(&piProcInfo, sizeof(PROCESS_INFORMATION)); 
    ZeroMemory(&siStartInfo, sizeof(STARTUPINFOA)); 
    siStartInfo.cb = sizeof(STARTUPINFOA); 
    siStartInfo.hStdError = hStdErrWrite; 
    siStartInfo.hStdOutput = hStdOutWrite; 
    siStartInfo.dwFlags |= STARTF_USESTDHANDLES;

    // Create the process
    std::string cmdLine = "cmd.exe /C " + cmd;
    BOOL bSuccess = CreateProcessA(NULL, (LPSTR)cmdLine.c_str(), NULL, NULL, TRUE, 0, NULL, NULL, &siStartInfo, &piProcInfo);

    // Close write ends in parent
    CloseHandle(hStdOutWrite); CloseHandle(hStdErrWrite);
    if (!bSuccess) {
        CloseHandle(hStdOutRead); CloseHandle(hStdErrRead);
        return "{\"ok\":false,\"error\":\"create_process_failed\"}";
    }

    // Wait for process with timeout
    DWORD wait = WaitForSingleObject(piProcInfo.hProcess, (DWORD)(timeout_seconds * 1000));
    if (wait == WAIT_TIMEOUT) {
        TerminateProcess(piProcInfo.hProcess, 1);
    }

    // Read pipes
    std::string stdout_str = read_pipe(hStdOutRead);
    std::string stderr_str = read_pipe(hStdErrRead);

    DWORD exitCode = 1;
    GetExitCodeProcess(piProcInfo.hProcess, &exitCode);

    CloseHandle(hStdOutRead); CloseHandle(hStdErrRead);
    CloseHandle(piProcInfo.hProcess); CloseHandle(piProcInfo.hThread);

    std::ostringstream oss;
    oss << "{\"ok\":true,\"rc\":" << exitCode << ",\"stdout\":\"" << escape_json(stdout_str) << "\",\"stderr\":\"" << escape_json(stderr_str) << "\"}";
    return oss.str();
}

#else // POSIX implementation

static std::string read_fd_until(int fd, int timeout_seconds) {
    std::string out;
    char buf[4096];
    fd_set set;
    struct timeval tv;
    while (true) {
        FD_ZERO(&set);
        FD_SET(fd, &set);
        tv.tv_sec = timeout_seconds;
        tv.tv_usec = 0;
        int rv = select(fd + 1, &set, NULL, NULL, &tv);
        if (rv == -1) break; // error
        if (rv == 0) break; // timeout
        ssize_t n = read(fd, buf, sizeof(buf));
        if (n <= 0) break;
        out.append(buf, buf + n);
    }
    return out;
}

std::string run_command_lib(const std::string &cmd, bool dry_run, int timeout_seconds) {
    if (cmd.empty()) return "{\"ok\":false,\"error\":\"empty command\"}";
    std::string exe = cmd;
    auto sp = exe.find(' ');
    if (sp != std::string::npos) exe = exe.substr(0, sp);
    if (!is_whitelisted(exe)) return "{\"ok\":false,\"error\":\"not whitelisted\"}";
    if (dry_run) return "{\"ok\":true,\"dry_run\":true,\"cmd\":\"" + escape_json(cmd) + "\"}";

    int outpipe[2];
    int errpipe[2];
    if (pipe(outpipe) == -1) return "{\"ok\":false,\"error\":\"pipe_failed\"}";
    if (pipe(errpipe) == -1) return "{\"ok\":false,\"error\":\"pipe_failed\"}";

    pid_t pid = fork();
    if (pid == -1) {
        return "{\"ok\":false,\"error\":\"fork_failed\"}";
    }
    if (pid == 0) {
        // child
        dup2(outpipe[1], STDOUT_FILENO);
        dup2(errpipe[1], STDERR_FILENO);
        close(outpipe[0]); close(outpipe[1]);
        close(errpipe[0]); close(errpipe[1]);
        // Use /bin/sh -c to execute the command string
        execl("/bin/sh", "sh", "-c", cmd.c_str(), (char*)NULL);
        _exit(127);
    }

    // parent
    close(outpipe[1]); close(errpipe[1]);
    // Set non-blocking
    fcntl(outpipe[0], F_SETFL, O_NONBLOCK);
    fcntl(errpipe[0], F_SETFL, O_NONBLOCK);

    std::string stdout_str, stderr_str;
    auto start = std::chrono::steady_clock::now();
    bool finished = false;
    while (true) {
        // check if child exited
        int status;
        pid_t r = waitpid(pid, &status, WNOHANG);
        if (r == pid) {
            finished = true;
        }

        // read available data
        char buf[4096];
        ssize_t n = read(outpipe[0], buf, sizeof(buf));
        if (n > 0) stdout_str.append(buf, buf + n);
        n = read(errpipe[0], buf, sizeof(buf));
        if (n > 0) stderr_str.append(buf, buf + n);

        if (finished) break;

        auto now = std::chrono::steady_clock::now();
        if (std::chrono::duration_cast<std::chrono::seconds>(now - start).count() > timeout_seconds) {
            // timeout: kill child
            kill(pid, SIGKILL);
            break;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(50));
    }

    // drain remaining
    char buf[4096];
    ssize_t n;
    while ((n = read(outpipe[0], buf, sizeof(buf))) > 0) stdout_str.append(buf, buf + n);
    while ((n = read(errpipe[0], buf, sizeof(buf))) > 0) stderr_str.append(buf, buf + n);

    close(outpipe[0]); close(errpipe[0]);

    int rc = -1;
    int status;
    if (waitpid(pid, &status, 0) == pid) {
        if (WIFEXITED(status)) rc = WEXITSTATUS(status);
        else rc = -1;
    }

    std::ostringstream oss;
    oss << "{\"ok\":true,\"rc\":" << rc << ",\"stdout\":\"" << escape_json(stdout_str) << "\",\"stderr\":\"" << escape_json(stderr_str) << "\"}";
    return oss.str();
}

#endif
