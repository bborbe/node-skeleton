# Graceful Shutdown

The server must drain in-flight requests before exiting.

## Sequence

1. Receive SIGTERM.
2. Stop accepting new connections.
3. Wait for in-flight requests, up to 20 seconds.
4. Close the database pool.
5. Exit zero.

## Timeouts

| Phase | Budget |
|---|---|
| stop accepting | immediate |
| drain requests | 20 s |
| close pool | 5 s |
| total | 30 s |

The Kubernetes termination grace period is set to 25 seconds in the deployment
manifest. Because the drain phase alone may take 20 seconds, the pool close can
be cut short and in-flight transactions may be aborted.

## Known gap

Nothing currently tracks whether step 4 completed. The process exits zero
regardless, so a pool that failed to close is indistinguishable from a clean
shutdown in the logs.

## Test approach

A test server with a deliberately slow handler is started, SIGTERM is sent
mid-request, and the response is asserted to complete. This test currently
passes because the handler is faster than the drain budget.
