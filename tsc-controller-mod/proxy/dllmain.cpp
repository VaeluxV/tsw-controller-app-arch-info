#include <File/Macros.hpp>

#include <cstdint>
#include <fstream>
#include <string>

#define WIN32_LEAN_AND_MEAN
#include <Windows.h>
#include <shellapi.h>
#include <filesystem>

#pragma comment(lib, "user32.lib")
#pragma comment(lib, "shell32.lib")

using namespace RC;
namespace fs = std::filesystem;

HMODULE SOriginalDll = nullptr;
extern "C" uintptr_t mProcs[20] = {0};

void setup_functions()
{
    mProcs[0] = (uintptr_t)GetProcAddress(SOriginalDll, "ApplyCompatResolutionQuirking");
    mProcs[1] = (uintptr_t)GetProcAddress(SOriginalDll, "CompatString");
    mProcs[2] = (uintptr_t)GetProcAddress(SOriginalDll, "CompatValue");
    mProcs[3] = (uintptr_t)GetProcAddress(SOriginalDll, "CreateDXGIFactory");
    mProcs[4] = (uintptr_t)GetProcAddress(SOriginalDll, "CreateDXGIFactory1");
    mProcs[5] = (uintptr_t)GetProcAddress(SOriginalDll, "CreateDXGIFactory2");
    mProcs[6] = (uintptr_t)GetProcAddress(SOriginalDll, "DXGID3D10CreateDevice");
    mProcs[7] = (uintptr_t)GetProcAddress(SOriginalDll, "DXGID3D10CreateLayeredDevice");
    mProcs[8] = (uintptr_t)GetProcAddress(SOriginalDll, "DXGID3D10GetLayeredDeviceSize");
    mProcs[9] = (uintptr_t)GetProcAddress(SOriginalDll, "DXGID3D10RegisterLayers");
    mProcs[10] = (uintptr_t)GetProcAddress(SOriginalDll, "DXGIDeclareAdapterRemovalSupport");
    mProcs[11] = (uintptr_t)GetProcAddress(SOriginalDll, "DXGIDisableVBlankVirtualization");
    mProcs[12] = (uintptr_t)GetProcAddress(SOriginalDll, "DXGIDumpJournal");
    mProcs[13] = (uintptr_t)GetProcAddress(SOriginalDll, "DXGIGetDebugInterface1");
    mProcs[14] = (uintptr_t)GetProcAddress(SOriginalDll, "DXGIReportAdapterConfiguration");
    mProcs[15] = (uintptr_t)GetProcAddress(SOriginalDll, "PIXBeginCapture");
    mProcs[16] = (uintptr_t)GetProcAddress(SOriginalDll, "PIXEndCapture");
    mProcs[17] = (uintptr_t)GetProcAddress(SOriginalDll, "PIXGetCaptureState");
    mProcs[18] = (uintptr_t)GetProcAddress(SOriginalDll, "SetAppCompatStringPointer");
    mProcs[19] = (uintptr_t)GetProcAddress(SOriginalDll, "UpdateHMDEmulationStatus");
}

void load_original_dll()
{
    wchar_t path[MAX_PATH];
    GetSystemDirectory(path, MAX_PATH);

    std::wstring dll_path = std::wstring(path) + L"\\dxgi.dll";

    SOriginalDll = LoadLibrary(dll_path.c_str());
    if (!SOriginalDll)
    {
        MessageBox(nullptr, L"Failed to load proxy DLL", L"TSCMOD Error", MB_OK | MB_ICONERROR);
        ExitProcess(0);
    }
}

bool is_absolute_path(const std::string& path)
{
    return fs::path(path).is_absolute();
}

HMODULE load_tscmod_dll(HMODULE moduleHandle)
{
    HMODULE hModule = nullptr;
    wchar_t moduleFilenameBuffer[1024]{'\0'};
    GetModuleFileNameW(moduleHandle, moduleFilenameBuffer, sizeof(moduleFilenameBuffer) / sizeof(wchar_t));
    const auto currentPath = std::filesystem::path(moduleFilenameBuffer).parent_path();
    const fs::path dllpath = currentPath / "tscmod" / "tscmod.dll";

    // Attempt to load tscmod.dll
    hModule = LoadLibrary(dllpath.c_str());

    return hModule;
}

BOOL WINAPI DllMain(HMODULE hInstDll, DWORD fdwReason, LPVOID lpvReserved)
{
    if (fdwReason == DLL_PROCESS_ATTACH)
    {
        load_original_dll();
        setup_functions();

        HMODULE hTSCMODDll = load_tscmod_dll(hInstDll);
        if (!hTSCMODDll)
        {
            MessageBox(nullptr, L"Failed to load tscmod.dll.", L"TSCMOD Error", MB_OK | MB_ICONERROR);
            ExitProcess(0);
        }
    }
    else if (fdwReason == DLL_PROCESS_DETACH)
    {
        FreeLibrary(SOriginalDll);
    }
    return TRUE;
}
