.PHONY: verify-frontend verify-backend verify

verify-frontend:
	cd frontend && npm ci --no-audit --no-fund && npm run lint && npm run typecheck && npm run test

verify-backend:
	cd backend && \
	if [ -f mvnw ]; then \
	  chmod +x mvnw && ./mvnw --batch-mode test; \
	elif command -v mvn >/dev/null 2>&1; then \
	  mvn --batch-mode test; \
	else \
	  echo "ERROR: neither backend/mvnw nor mvn is available. Add Maven Wrapper to backend."; \
	  exit 1; \
	fi

verify: verify-frontend verify-backend
  