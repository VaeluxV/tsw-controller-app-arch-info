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
extern "C" uintptr_t mProcs[32] = {0};

void setup_functions()
{
    mProcs[0] = (uintptr_t)GetProcAddress(SOriginalDll, "D3DPERF_BeginEvent");
    mProcs[1] = (uintptr_t)GetProcAddress(SOriginalDll, "D3DPERF_EndEvent");
    mProcs[2] = (uintptr_t)GetProcAddress(SOriginalDll, "D3DPERF_GetStatus");
    mProcs[3] = (uintptr_t)GetProcAddress(SOriginalDll, "D3DPERF_QueryRepeatFrame");
    mProcs[4] = (uintptr_t)GetProcAddress(SOriginalDll, "D3DPERF_SetMarker");
    mProcs[5] = (uintptr_t)GetProcAddress(SOriginalDll, "D3DPERF_SetOptions");
    mProcs[6] = (uintptr_t)GetProcAddress(SOriginalDll, "D3DPERF_SetRegion");
    mProcs[7] = (uintptr_t)GetProcAddress(SOriginalDll, "DebugSetLevel");
    mProcs[8] = (uintptr_t)GetProcAddress(SOriginalDll, "DebugSetMute");
    mProcs[9] = (uintptr_t)GetProcAddress(SOriginalDll, "Direct3D9EnableMaximizedWindowedModeShim");
    mProcs[10] = (uintptr_t)GetProcAddress(SOriginalDll, "Direct3DCreate9");
    mProcs[11] = (uintptr_t)GetProcAddress(SOriginalDll, "Direct3DCreate9Ex");
    mProcs[12] = (uintptr_t)GetProcAddress(SOriginalDll, "Direct3DCreate9On12");
    mProcs[13] = (uintptr_t)GetProcAddress(SOriginalDll, "Direct3DCreate9On12Ex");
    mProcs[14] = (uintptr_t)GetProcAddress(SOriginalDll, "Direct3DShaderValidatorCreate9");
    mProcs[15] = (uintptr_t)GetProcAddress(SOriginalDll, "PSGPError");
    mProcs[16] = (uintptr_t)GetProcAddress(SOriginalDll, "PSGPSampleTexture");
    mProcs[17] = (uintptr_t)GetProcAddress(SOriginalDll, MAKEINTRESOURCEA(24));
    mProcs[18] = (uintptr_t)GetProcAddress(SOriginalDll, MAKEINTRESOURCEA(25));
    mProcs[19] = (uintptr_t)GetProcAddress(SOriginalDll, MAKEINTRESOURCEA(26));
    mProcs[20] = (uintptr_t)GetProcAddress(SOriginalDll, MAKEINTRESOURCEA(27));
    mProcs[21] = (uintptr_t)GetProcAddress(SOriginalDll, MAKEINTRESOURCEA(28));
    mProcs[22] = (uintptr_t)GetProcAddress(SOriginalDll, MAKEINTRESOURCEA(29));
    mProcs[23] = (uintptr_t)GetProcAddress(SOriginalDll, MAKEINTRESOURCEA(30));
    mProcs[24] = (uintptr_t)GetProcAddress(SOriginalDll, MAKEINTRESOURCEA(31));
    mProcs[25] = (uintptr_t)GetProcAddress(SOriginalDll, MAKEINTRESOURCEA(32));
    mProcs[26] = (uintptr_t)GetProcAddress(SOriginalDll, MAKEINTRESOURCEA(33));
    mProcs[27] = (uintptr_t)GetProcAddress(SOriginalDll, MAKEINTRESOURCEA(34));
    mProcs[28] = (uintptr_t)GetProcAddress(SOriginalDll, MAKEINTRESOURCEA(35));
    mProcs[29] = (uintptr_t)GetProcAddress(SOriginalDll, MAKEINTRESOURCEA(36));
    mProcs[30] = (uintptr_t)GetProcAddress(SOriginalDll, MAKEINTRESOURCEA(37));
    mProcs[31] = (uintptr_t)GetProcAddress(SOriginalDll, MAKEINTRESOURCEA(38));
}

void load_original_dll()
{
    wchar_t path[MAX_PATH];
    GetSystemDirectory(path, MAX_PATH);

    std::wstring dll_path = std::wstring(path) + L"\\d3d9.dll";

    SOriginalDll = LoadLibrary(dll_path.c_str());
    if (!SOriginalDll)
    {
        MessageBox(nullptr, L"Failed to load proxy DLL", L"TSCMOD Error", MB_OK | MB_ICONERROR);
        ExitProcess(0);
    }
}

HMODULE load_tscmod_dll(HMODULE moduleHandle)
{
    HMODULE hModule = nullptr;
    wchar_t moduleFilenameBuffer[1024]{'\0'};
    GetModuleFileNameW(moduleHandle, moduleFilenameBuffer, sizeof(moduleFilenameBuffer) / sizeof(wchar_t));
    const auto currentPath = std::filesystem::path(moduleFilenameBuffer).parent_path();
    const fs::path tscmodPath = currentPath / "plugins" / "tscmod.dll";
    hModule = LoadLibrary(tscmodPath.c_str());

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
