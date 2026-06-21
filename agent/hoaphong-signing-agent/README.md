# HoaPhong Signing Agent (Windows)

Local agent de quet cert USB token runtime (khong co dinh CA).

## Run

```bash
cd agent/hoaphong-signing-agent
dotnet run --urls "http://127.0.0.1:8777"
```

Optional auth token:

```bash
set SIGNING_AGENT_TOKEN=change-me
```

## Endpoints

- `GET /health`
- `GET /certificates`
- `POST /sign`

Request:

```json
{
  "xml": "<VNACCS_TEST>...</VNACCS_TEST>",
  "thumbprint": "ABCDEF..."
}
```

Response:

```json
{
  "ok": true,
  "message": "Ky XML thanh cong.",
  "signedXml": "<VNACCS_TEST>...<Signature>...</Signature></VNACCS_TEST>"
}
```

ERP env:

```env
CUSTOMS_SIGNING_AGENT_URL=http://127.0.0.1:8777
CUSTOMS_SIGNING_AGENT_TOKEN=change-me
```
