---
description: Validate, commit, push, and deploy changes to vps-ir
---

Deploy the current changes end to end. Read `AGENTS.md` first and determine whether the scope is `frontend`, `backend`, or both.

- Inspect `git status`, `git diff`, and recent commits. Never stage unrelated files, secrets, or generated files.
- Validate frontend changes with `cd front_end && npx tsc --noEmit && npm run lint && npm run build`.
- Validate backend changes with `gofmt -l` on changed Go files, `go test ./...`, `go vet ./...`, and `go build -o main .`.
- Stage only intended paths, commit with a concise message, and push `develop` with `git push origin develop`.
- Check that `/root/voxcina` on `vps-ir` is clean, then run `git pull --ff-only origin develop` and verify the pushed SHA.
- For frontend changes, copy and build the existing container:

```bash
ssh -o ConnectTimeout=10 vps-ir 'docker cp /root/voxcina/front_end/src/. voxcina_frontend:/app/src/'
ssh -o ConnectTimeout=10 vps-ir 'docker exec voxcina_frontend npm run build'
ssh -o ConnectTimeout=10 vps-ir 'docker restart voxcina_frontend'
```

- For backend changes, build `CGO_ENABLED=0 GOOS=linux go build -o /tmp/voxcina-server .`, `scp` it to `vps-ir`, copy it to `api-server:/app/main`, and restart `api-server`.
- Verify the commit SHA, `docker ps`, and recent logs for the deployed services. Stop if the VPS worktree is dirty or any validation/deployment step fails.
