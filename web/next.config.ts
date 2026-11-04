import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The answer key lives in Postgres and is only ever read inside route
  // handlers, so nothing here needs to be exposed to the client bundle.
  typedRoutes: true,
  // This folder is its own app, sitting inside the repo that holds the
  // original HTML game. Pin the trace root so Next doesn't walk up and adopt
  // the game's lockfile (or the one in the home directory) as the workspace.
  outputFileTracingRoot: path.join(import.meta.dirname, '..'),
};

export default nextConfig;
