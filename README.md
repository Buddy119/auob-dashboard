# auob-dashboard

## Collection API Examples

Upload a Postman collection and optional environment:

```bash
curl -X POST http://localhost:4000/api/collections/upload \
  -F "collection=@./samples/simple.collection.json;type=application/json" \
  -F "env=@./samples/dev.env.json;type=application/json"
```

List collections:

```bash
curl "http://localhost:4000/api/collections?limit=10&offset=0&q=test"
```

Fetch a single collection:

```bash
curl "http://localhost:4000/api/collections/<collectionId>"
```
