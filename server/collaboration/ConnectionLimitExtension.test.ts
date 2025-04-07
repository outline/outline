import { Server } from "@hocuspocus/server";
import WebSocket from "ws";
import EDITOR_VERSION from "@shared/editor/version";
import { sleep } from "@server/utils/timers";
import { ConnectionLimitExtension } from "./ConnectionLimitExtension";
import { EditorVersionExtension } from "./EditorVersionExtension";

jest.mock("@server/env", () => ({
  COLLABORATION_MAX_CLIENTS_PER_DOCUMENT: 2,
}));

describe("ConnectionLimitExtension", () => {
  let server: typeof Server;
  let extension: ConnectionLimitExtension;
  const port = 12345;
  const url = `ws://localhost:${port}`;
  const documentName = "test";

  beforeEach(async () => {
    extension = new ConnectionLimitExtension();
    server = Server.configure({
      port,
      extensions: [extension, new EditorVersionExtension()],
    });
    await server.listen();
  });

  afterEach(async () => {
    await server.destroy();
  });

  const getConnections = () =>
    extension.connectionsByDocument.get(documentName)?.size ?? 0;

  const createWebSocket = (editorVersion = EDITOR_VERSION) =>
    new Promise<WebSocket>((resolve, reject) => {
      const ws = new WebSocket(
        `${url}/${documentName}?editorVersion=${editorVersion}`
      );
      ws.on("open", () => resolve(ws));
      ws.on("error", reject);
    });

  it("should allow connections within limit", async () => {
    const ws1 = await createWebSocket();
    const ws2 = await createWebSocket();

    expect(ws1.readyState).toBe(WebSocket.OPEN);
    expect(ws2.readyState).toBe(WebSocket.OPEN);
    expect(getConnections()).toBe(2);

    ws1.close();
    ws2.close();

    await sleep(250);
    expect(getConnections()).toBe(0);
  });

  it("should close connections exceeding limit", async () => {
    const ws1 = await createWebSocket();
    const ws2 = await createWebSocket();

    const ws3 = await createWebSocket();
    await sleep(250);

    expect(ws3.readyState).toBe(WebSocket.CLOSED);
    expect(ws2.readyState).toBe(WebSocket.OPEN);
    expect(ws1.readyState).toBe(WebSocket.OPEN);
    expect(getConnections()).toBe(2);

    ws1.close();
    ws2.close();

    await sleep(250);
    expect(getConnections()).toBe(0);
  });

  it("should handle connections closed by other extensions", async () => {
    const ws1 = await createWebSocket();

    // Create a connection that will be closed by the EditorVersionExtension
    const ws2 = await createWebSocket("1.0.0");

    ws1.close();
    ws2.close();

    await sleep(250);
    expect(getConnections()).toBe(0);
  });

  it("should allow new connection after disconnect", async () => {
    const ws1 = await createWebSocket();
    const ws2 = await createWebSocket();

    ws1.close();
    await sleep(250);
    expect(getConnections()).toBe(1);

    const ws3 = await createWebSocket();
    expect(ws3.readyState).toBe(WebSocket.OPEN);
    expect(getConnections()).toBe(2);

    ws2.close();
    ws3.close();

    await sleep(250);
    expect(getConnections()).toBe(0);
  });
});
