use futures_util::{SinkExt, StreamExt};
use once_cell::sync::Lazy;
use std::ffi::{CStr, CString};
use std::sync::{Arc, RwLock};
use std::{fmt, thread};
use std::time::Duration;
use tokio::runtime::Runtime;
use tokio::sync::mpsc::{self, Sender};
use tokio_tungstenite::connect_async;
use tungstenite::{protocol::Message, Utf8Bytes};

/// C callback signature: void (*MessageCallback)(const char*)
pub type MessageCallback = extern "C" fn(*const std::ffi::c_char);

/// Holds state of the DLL
struct DLLState {
    rt: Option<Runtime>,
    stop_tx: Option<Sender<()>>,
    outgoing_tx: Option<Sender<String>>,
    callback: Option<MessageCallback>,
}

static STATE: Lazy<Arc<RwLock<DLLState>>> = Lazy::new(|| {
    Arc::new(RwLock::new(DLLState {
        rt: None,
        stop_tx: None,
        outgoing_tx: None,
        callback: None,
    }))
});

// /// Start WebSocket loop inside a Tokio runtime
// #[no_mangle]
// pub extern "C" fn tsw_controller_mod_start() {
//     println!("[socket_connection_lib][info] starting tsw_controller_mod");

//     let mut st = STATE.write().unwrap_or_else(|poisoned| poisoned.into_inner());
//     if st.rt.is_some() {
//         return; // already running
//     }

//     // create tokio runtime
//     let rt =  tokio::runtime::Builder::new_multi_thread().enable_all().build().expect("Failed to create runtime");

//     // create channels
//     let (stop_tx, mut stop_rx) = mpsc::channel::<()>(1);
//     let (out_tx, mut out_rx) = mpsc::channel::<String>(64);

//     let ws_url = "ws://127.0.0.1:63241".to_string();
//     let state_clone = STATE.clone();

//     rt.spawn(async move {
//         loop {
//             println!("[socket_connection_lib][info] attempting to connect to socket");
//             tokio::select! {
//                 _ = stop_rx.recv() => {
//                     break;
//                 }
//                 conect_res = connect_async(ws_url.as_str()) => {
//                     match conect_res {
//                         Ok((ws_stream, _)) => {
//                             let (mut ws_write, mut ws_read) = ws_stream.split();

//                             let (reconnect_tx, mut reconnect_rx) = mpsc::channel::<()>(1);

//                             // Forward incoming WS messages to callback
//                             let state_c = state_clone.clone();
//                             tokio::spawn(async move {
//                                 while let Some(Ok(msg)) = ws_read.next().await {
//                                   match msg {
//                                      tungstenite::Message::Text(text) => {
//                                         let guard = state_c.read().unwrap_or_else(|poisoned| poisoned.into_inner());
//                                         if let Some(cb) = guard.callback {
//                                             if let Ok(cstr) = CString::new(text.to_string()) {
//                                                 println!("[socket_connection_lib][info] received message from socket | {}", text);
//                                                 cb(cstr.as_ptr());
//                                                 // ⚠️ Important: must keep CString alive until cb returns
//                                                 // that's why cstr lives inside this block
//                                             }
//                                         }
//                                      },
//                                      tungstenite::Message::Close(_) => {
//                                       break;
//                                      },
//                                      _ => {},
//                                   }
//                                 }
//                                 /* if this while ends - the read resulted in an error - try send reconnect_tx */
//                                 println!("[socket_connection_lib][info] closing connection and reconnecting due to error or close message");
//                                 let _ = reconnect_tx.try_send(());
//                             });

//                             // Outgoing loop
//                             loop {
//                                 tokio::select! {
//                                     Some(msg) = out_rx.recv() => {
//                                       println!("[socket_connection_lib][info] sending message | {}", msg);
//                                         if let Err(e) = ws_write.send(Message::Text(Utf8Bytes::from(msg))).await {
//                                            println!("[socket_connection_lib][info] failed to send message | {}", e);
//                                             break; // reconnect
//                                         }
//                                     }
//                                     _ = reconnect_rx.recv() => {
//                                       break;
//                                     },
//                                     _ = stop_rx.recv() => {
//                                         let _ = ws_write.send(Message::Close(None)).await;
//                                         return;
//                                     }
//                                 }
//                             }
//                         }
//                         Err(e) => {
//                             println!("[socket_connection_lib][error] failed to connect to socket - retrying in 5s | {}", e);
//                             tokio::time::sleep(std::time::Duration::from_secs(5)).await;
//                             continue;
//                         }
//                     }
//                 }
//             }
//         }
//     });

//     st.rt = Some(rt);
//     st.stop_tx = Some(stop_tx);
//     st.outgoing_tx = Some(out_tx);
// }

// /// Stop the module
// #[no_mangle]
// pub extern "C" fn tsw_controller_mod_stop() {
//     let mut st = STATE.write().unwrap_or_else(|poisoned| poisoned.into_inner());
//     if let Some(stop_tx) = st.stop_tx.take() {
//         let _ = stop_tx.try_send(());
//     }
//     st.rt.take(); // dropping runtime shuts it down
// }

// /// Register callback
// #[no_mangle]
// pub extern "C" fn tsw_controller_mod_set_receive_message_callback(cb: MessageCallback) {
//     let mut st = STATE.write().unwrap_or_else(|poisoned| poisoned.into_inner());
//     st.callback = Some(cb);
// }

// /// Send message
// #[no_mangle]
// pub extern "C" fn tsw_controller_mod_send_message(message: *const std::ffi::c_char) {
//     if message.is_null() {
//         return;
//     }

//     let cstr = unsafe { CStr::from_ptr(message) };
//     if let Ok(msg) = cstr.to_str() {
//         let st = STATE.read().unwrap_or_else(|poisoned| poisoned.into_inner());
//         if let Some(tx) = &st.outgoing_tx {
//           let message = msg.to_string();
//             println!("[socket_connection_lib][info] sending message {}",message.clone());
//             let send_result = tx.try_send(message);
//             if let Err(e) = send_result {
//               println!("[socket_connection_lib][error] failed to send message {}", e.to_string());
//             }
//         }
//     } else {
//       println!("[socket_connection_lib][error] failed to decode cstr");
//     }
// }

pub fn mod_init() {
    println!("[tscmod][info] initializing tscmod");

    thread::spawn(|| {
        // unsafe {
        //     let lib = libloading::Library::new("RailDriver64.dll");
        //     if lib.is_err() {
        //         let error = lib.as_ref().err().unwrap();
        //         reqwest::blocking::get(format!("http://127.0.0.1:8080/test?error={}", error));
        //     }
        // }
        let context = libraildriver::Context::new();

        loop {
            // Your logic here
            let maybespeed = context.get_value(libraildriver::Value::Speedometer, libraildriver::Kind::Current);
            if maybespeed.is_ok() {
                reqwest::blocking::get(format!("http://127.0.0.1:8080/test?speed={}", maybespeed.unwrap()));
            } else {
                reqwest::blocking::get("http://127.0.0.1:8080/test?err=nospeed");
            }
            thread::sleep(Duration::from_millis(500)); // Avoid busy-waiting
        }
    });
}

pub fn mod_destroy() {}


fn module_path_from_hmodule(hmodule: HMODULE) -> Option<PathBuf> {
    let mut buffer = vec![0u16; 260];

    let len = unsafe {
        GetModuleFileNameW(hmodule, &mut buffer)
    };

    if len == 0 {
        return None;
    }

    buffer.truncate(len as usize);
    Some(PathBuf::from(String::from_utf16_lossy(&buffer)))
}

#[no_mangle]
#[cfg(target_os = "windows")]
pub extern "system" fn DllMain(_hinst_dll: *mut u8, fwd_reason: u32, _lp_reserved: *mut u8) -> i32 {
    /* DLL_PROCESS_ATTACH */
    if fwd_reason == 1 {
        mod_init();
    }

    /* DLL_PROCESS_DETACH */
    if fwd_reason == 0 {
        mod_destroy();
    }

    1
}
