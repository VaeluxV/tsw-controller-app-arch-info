use futures_util::{SinkExt, StreamExt};
use libloading::Library;
use once_cell::sync::Lazy;
use windows::core::PCWSTR;
use std::collections::HashMap;
use std::ffi::{CStr, CString, c_uint};
use std::path::PathBuf;
use std::sync::{Arc, Mutex, RwLock};
use std::{fmt, thread};
use std::time::Duration;
use tokio::runtime::Runtime;
use tokio::sync::mpsc::{self};
use tokio::sync::broadcast;
use std::iter;
use tokio_tungstenite::connect_async;
use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use tungstenite::{protocol::Message, Utf8Bytes};
use windows::Win32::Foundation::HMODULE;
use windows::Win32::System::LibraryLoader::{GetModuleFileNameW,AddDllDirectory};
use libc::{c_char, c_float, c_int};

/// C callback signature: void (*MessageCallback)(const char*)
pub type MessageCallback = extern "C" fn(*const std::ffi::c_char);

/// Holds state of the DLL
struct DLLState {
    rt: Option<Runtime>,
    stop_tx: Option<broadcast::Sender<()>>,
    outgoing_tx: Option<mpsc::Sender<String>>,
}

static STATE: Lazy<Arc<RwLock<DLLState>>> = Lazy::new(|| {
    Arc::new(RwLock::new(DLLState {
        rt: None,
        stop_tx: None,
        outgoing_tx: None,
    }))
});


fn module_path_from_hmodule(hmodule: HMODULE) -> Option<PathBuf> {
    let mut buffer = vec![0u16; 260];

    let len = unsafe {
        GetModuleFileNameW(Some(hmodule), &mut buffer)
    };

    if len == 0 {
        return None;
    }

    buffer.truncate(len as usize);
    Some(PathBuf::from(String::from_utf16_lossy(&buffer)))
}

unsafe fn get_loco_name(lib: &Library) -> &str {
    let loconame_raw = lib.get::<unsafe extern "C" fn() -> * const c_char>(b"GetLocoName")
        .unwrap()();
    let cstr = CStr::from_ptr(loconame_raw);
    match cstr.to_str() {
        Ok(v) => v,
        _ => "",
    }
}

unsafe fn get_controller_list(lib: &Library) -> HashMap<&str, usize> {
    let controllerlist_raw = lib.get::<unsafe extern "C" fn() -> * const c_char>(b"GetControllerList")
        .unwrap()();
    let cstr = CStr::from_ptr(controllerlist_raw);

    match cstr.to_str() {
        Ok(v) => {
            if v.is_empty() {
                return HashMap::new();
            }

            let mut map = HashMap::<&str, usize>::new();
            for (index, control_name) in v.split("::").enumerate() {
                map.insert(control_name, index);
            }
            map
        },
        _ => HashMap::new(),
    }
}

unsafe fn get_controller_value(lib: &Library, index: c_int, value_type: c_int) -> c_float {
    lib.get::<unsafe extern "C" fn(c_int, c_int) -> c_float>(b"GetControllerValue")
        .unwrap()(index, value_type)
}

unsafe fn set_controller_value(lib: &Library, index: c_int, value: c_float) {
    lib.get::<unsafe extern "C" fn(c_int, c_float) -> c_float>(b"SetControllerValue")
        .unwrap()(index, value);
}

pub fn mod_init(hmod: HMODULE) {
    println!("[tscmod][info] initializing tscmod");

    let dllpath = module_path_from_hmodule(hmod).unwrap();
    let dlldir = dllpath.parent().unwrap();
    let raildriverpath = dlldir.join("RailDriver64.dll");

    let mut st = STATE.write().unwrap_or_else(|poisoned| poisoned.into_inner());
    if st.rt.is_some() {
        return; // already running
    }

    // load raildriver lib
    let lib = unsafe {
        let lib = libloading::Library::new(raildriverpath).unwrap();
        lib.get::<unsafe extern "C" fn(bool)>(b"SetRailDriverConnected").unwrap()(true);
        Arc::new(Mutex::new(lib))
    };

    // create tokio runtime
    let rt =  tokio::runtime::Builder::new_multi_thread().enable_all().build().expect("Failed to create runtime");

    // create channels
    let (stop_tx, _) = broadcast::channel::<()>(1);
    let (out_tx, mut out_rx) = mpsc::channel::<String>(64);

    let ws_url = "ws://127.0.0.1:63241".to_string();
    // let state_clone = STATE.clone();

    let socket_lib = Arc::clone(&lib);
    let mut socket_stop_rx = stop_tx.subscribe();
    rt.spawn(async move {
        loop {
            println!("[tscmod][info] attempting to connect to socket");
            tokio::select! {
                _ = socket_stop_rx.recv() => {
                    break;
                }
                conect_res = connect_async(ws_url.as_str()) => {
                    match conect_res {
                        Ok((ws_stream, _)) => {
                            let (mut ws_write, mut ws_read) = ws_stream.split();

                            let (reconnect_tx, mut reconnect_rx) = mpsc::channel::<()>(1);

                            // Forward incoming WS messages to callback
                            // let state_c = state_clone.clone();
                            let read_loop_lib = Arc::clone(&socket_lib);
                            tokio::spawn(async move {
                                while let Some(Ok(msg)) = ws_read.next().await {
                                  match msg {
                                     tungstenite::Message::Text(text) => {
                                        let msg_split: Vec<&str> = text.split(",").collect();
                                        if msg_split[0] == "direct_control" {
                                            /* collect properties from direct control message */
                                            let mut properties = HashMap::<&str, &str>::new();
                                            for part in msg_split.iter().skip(1) {
                                                let valuesplit: Vec<&str> = part.split("=").collect();
                                                if valuesplit.len() == 2 {
                                                    properties.insert(valuesplit[0], valuesplit[1]);
                                                }
                                            }

                                            /* now apply value */
                                            if properties.contains_key("controls") && properties.contains_key("value") {
                                                let lib = read_loop_lib.lock().unwrap();
                                                unsafe {
                                                    let controls = get_controller_list(&lib);
                                                    if controls.contains_key(properties["controls"]) {
                                                        let control_index = controls[properties["controls"]];
                                                        set_controller_value(&lib, control_index as c_int, properties["value"].parse().unwrap());
                                                    }
                                                }
                                            }
                                        }
                                     },
                                     tungstenite::Message::Close(_) => {
                                      break;
                                     },
                                     _ => {},
                                  }
                                }
                                /* if this while ends - the read resulted in an error - try send reconnect_tx */
                                println!("[socket_connection_lib][info] closing connection and reconnecting due to error or close message");
                                let _ = reconnect_tx.try_send(());
                            });

                            // Outgoing loop
                            loop {
                                tokio::select! {
                                    Some(msg) = out_rx.recv() => {
                                      println!("[socket_connection_lib][info] sending message | {}", msg);
                                        if let Err(e) = ws_write.send(Message::Text(Utf8Bytes::from(msg))).await {
                                           println!("[socket_connection_lib][info] failed to send message | {}", e);
                                            break; // reconnect
                                        }
                                    }
                                    _ = reconnect_rx.recv() => {
                                      break;
                                    },
                                    _ = socket_stop_rx.recv() => {
                                        let _ = ws_write.send(Message::Close(None)).await;
                                        return;
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            println!("[socket_connection_lib][error] failed to connect to socket - retrying in 5s | {}", e);
                            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                            continue;
                        }
                    }
                }
            }
        }
    });

    let read_state_lib = Arc::clone(&lib);
    let mut read_state_stop_rx = stop_tx.subscribe();   
    rt.spawn(async move {
        unsafe {
            // libraildriver::Value::Speedometer
            loop {
                tokio::select! {
                    _ = read_state_stop_rx.recv() => {
                        break;
                    }
                    _ = tokio::time::sleep(Duration::from_millis(300)) => {
                        let lib = read_state_lib.lock().unwrap();
                        let st = STATE.read().unwrap_or_else(|poisoned| poisoned.into_inner());

                        let loconame = get_loco_name(&lib);
                        let controls = get_controller_list(&lib);

                        let drivable_msg = format!("current_drivable_actor,name={}", loconame);
                         if let Some(tx) = &st.outgoing_tx {
                            let drivable_send_result = tx.try_send(drivable_msg);
                            if let Err(e) = drivable_send_result {
                                println!("[tscmod][error] failed to send message {}", e.to_string());
                            }
                        }

                        for (control_name, index) in controls {
                            let controlvalue = get_controller_value(&lib, index as c_int, libraildriver::Kind::Current as c_int);
                            let msg = format!("sync_control_value,name={},property={},value={},normal_value={}", control_name, control_name, controlvalue, controlvalue);
                            if let Some(tx) = &st.outgoing_tx {
                                let send_result = tx.try_send(msg);
                                if let Err(e) = send_result {
                                    println!("[tscmod][error] failed to send message {}", e.to_string());
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    st.rt = Some(rt);
    st.stop_tx = Some(stop_tx);
    st.outgoing_tx = Some(out_tx);
}

pub fn mod_destroy() {
    let mut st = STATE.write().unwrap_or_else(|poisoned| poisoned.into_inner());
    if let Some(stop_tx) = st.stop_tx.take() {
        let _ = stop_tx.send(());
    }
    st.rt.take(); // dropping runtime shuts it down
}

#[no_mangle]
#[cfg(target_os = "windows")]
pub extern "system" fn DllMain(hmod: HMODULE, fwd_reason: u32, _lp_reserved: *mut u8) -> i32 {
    /* DLL_PROCESS_ATTACH */
    if fwd_reason == 1 {
        mod_init(hmod);
    }

    /* DLL_PROCESS_DETACH */
    if fwd_reason == 0 {
        mod_destroy();
    }

    1
}
