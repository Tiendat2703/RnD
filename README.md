# RnD

## Frontend

The Next.js frontend lives at the repository root.

```sh
npm ci
npm run dev
```

## AI agents

The Sidekick application and LiveKit agent server live in [agents/sidekick](agents/sidekick/). This package has its own dependencies and TypeScript configuration.

Source: [alex-f-p/sidekick](https://github.com/alex-f-p/sidekick), based on commit `10c9c0e`, with the LiveKit Cloud integration added.

Use Node.js 24. Install and validate the agent package:

```sh
cd agents/sidekick
npm ci
npm run check
npm test
npm run agent:build
```

For local development, copy `.env.example` to `.env.local` and fill in the required credentials on your machine. Environment files and credentials are excluded from Git.

### LiveKit Cloud

The configured project is `demo-m6ejx9q0`; the dispatch name is `sidekick`. To test the deployed agent, install the LiveKit CLI, authenticate with an account that can access this project, then run from `agents/sidekick`:

```sh
lk cloud auth
npm run verify:livekit
```

This smoke test verifies room connection, agent dispatch, and a state-command round trip. Provider credentials and a separate integration test are required to validate AI task execution.

The frontend/backend integration requires a backend-issued LiveKit room token and agent dispatch. Keep the LiveKit API secret on the backend. See [deployment and protocol documentation](agents/sidekick/docs/livekit-deployment.md) for configuration, commands, and limitations.

See the [Sidekick README](agents/sidekick/README.md) for local application setup and provider integration tests.
