import { atom } from "nanostores"
import { useStore } from "@nanostores/react"

class TSWAppConnector {
  private connection = atom<WebSocket | null>(null)
  private connectionState = atom<number | null>(null)

  useConnection = () => {
    const connection = useStore(this.connection)
    const connectionState = useStore(this.connectionState)
    return [connection, connectionState] as const
  }

  readyStateChange = () => {
    const connection = this.connection.get()
    this.connectionState.set(connection?.readyState ?? null)
  }

  connect = async (addr: string) => {
    const connection = this.connection.get()
    if (connection) {
      connection.removeEventListener('close', this.readyStateChange)
      connection.removeEventListener('open', this.readyStateChange)
      connection.removeEventListener('error', this.readyStateChange)
      connection.close()
    }
    const socket = new WebSocket(addr)
    this.connectionState.set(null)
    socket.addEventListener('close', this.readyStateChange)
    socket.addEventListener('open', this.readyStateChange)
    socket.addEventListener('error', this.readyStateChange)
    this.connection.set(socket)
  }
}

export const tswAppConnector = new TSWAppConnector()
