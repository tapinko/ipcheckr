import { HubConnectionBuilder, HttpTransportType, LogLevel } from "@microsoft/signalr"
import getApiBase from "./getApiBase"

export const createAttemptEventsConnection = () => {
  const baseUrl = getApiBase()
  const hubUrl = `${baseUrl}/hubs/attempt-events`

  return new HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => sessionStorage.getItem("token") ?? "",
      transport: HttpTransportType.WebSockets | HttpTransportType.ServerSentEvents | HttpTransportType.LongPolling
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build()
}