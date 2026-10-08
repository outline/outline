This directory contains the MCP server. The HTTP entry point is `server/routes/mcp`.

- `tools/` – the tools that MCP clients can call.
- `skills/` – the skills that are served with the skills extension (`skills/list`, `skills/get`).

Each tool is a self-contained unit of functionality that can be invoked by the MCP client to perform a specific task. To test the MCP with Claude in development make sure to run with the following command to ensure that the MCP server trusts the mkcert root CA certificate.

```bash
NODE_EXTRA_CA_CERTS=$(mkcert -CAROOT)/rootCA.pem claude
```
