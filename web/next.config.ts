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
  // The game file and its assets live one folder up, outside this app, and are
  // read from disk at request time -- so the build cannot see that the routes
  // need them, and a deployment would ship without them and serve a 500.
  // Listing them here copies them into the deployed functions. Verified by
  // `npm run check:trace` after a build, not assumed.
  // Keys are globs matched against the route path, so `[...path]` cannot be
  // written literally (brackets are a character class): `/icons/**` it is.
  outputFileTracingIncludes: {
    '/': ['../medsci-runner.html', './lib/runner-bridge.js'],
    '/battle3d.js': ['../battle3d.js'],
    '/feedback.html': ['../feedback.html'],
    '/feedback-questions.js': ['../feedback-questions.js'],
    '/icons/**': ['../icons/**/*'],
    '/images/**': ['../images/**/*'],
    '/atlas/**': ['../atlas/**/*'],
    '/vendor/**': ['../vendor/**/*'],
  },
};

export default nextConfig;
