import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

const ws = new WebSocket("ws://192.168.68.66:63241");
ws.addEventListener("open", () => {
  ws.send("");
});

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="container">
      <button
        onPointerDown={() => {
          ws.send("virtual_device_button_value,unique_id=virtual:1,device_id=virtual:1,device_name=POPOS,control=button1,value=1");
        }}
        onPointerUp={() => {
          ws.send("virtual_device_button_value,unique_id=virtual:1,device_id=virtual:1,device_name=POPOS,control=button1,value=0");
        }}
      ></button>
    </main>
  );
}

export default App;
