#pragma once

#include <array>
#include <bitset>
#include <cstddef>
#include <new>

namespace cortex::utils {

template<typename T, std::size_t SIZE>
class PoolAllocator {
public:
    PoolAllocator() { freeList_.reset(); }
    ~PoolAllocator() { clear(); }

    template<typename... Args>
    T* allocate(Args&&... args) {
        for (std::size_t i = 0; i < SIZE; ++i) {
            if (!freeList_.test(i)) {
                freeList_.set(i);
                T* ptr = reinterpret_cast<T*>(&storage_[i]);
                return new (ptr) T(std::forward<Args>(args)...);
            }
        }
        return nullptr; // out of memory
    }

    void deallocate(T* p) {
        if (!p) return;
        std::ptrdiff_t idx = (reinterpret_cast<char*>(p) - reinterpret_cast<char*>(storage_.data())) / sizeof(StorageType);
        if (idx < 0 || idx >= (ptrdiff_t)SIZE) return;
        p->~T();
        freeList_.reset((std::size_t)idx);
    }

    void clear() {
        for (std::size_t i = 0; i < SIZE; ++i) {
            if (freeList_.test(i)) {
                T* ptr = reinterpret_cast<T*>(&storage_[i]);
                ptr->~T();
                freeList_.reset(i);
            }
        }
    }

private:
    using StorageType = std::aligned_storage_t<sizeof(T), alignof(T)>;
    std::array<StorageType, SIZE> storage_;
    std::bitset<SIZE> freeList_;
};

} // namespace cortex::utils
