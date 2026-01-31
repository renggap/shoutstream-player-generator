# Stream Metadata Endpoint Handling

## Problem
Different streaming servers use different endpoints for metadata:
- **Icecast**: `/status-json.xsl` - JSON format with nested `icestats.source`
- **Shoutcast v1**: `/stats?sid=1&json=1` - Flat JSON with `songtitle`
- **Shoutcast v2**: `/api/statistics` - JSON with `streams` array

## Solution
The `fetchStreamMetadata` utility in `utils/metadata.ts` tries each endpoint in order with fallback.

## Adding New Server Types
To add support for a new server type:
1. Add endpoint to the `endpoints` array in `utils/metadata.ts`
2. Add parsing logic for the response format
3. Add tests in `utils/__tests__/metadata.test.ts`

## Testing
```bash
npm test -- metadata.test.ts
```
