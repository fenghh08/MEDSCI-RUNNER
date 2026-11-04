// Loads ../../game-data.js without changing it.
//
// game-data.js is an IIFE that assigns window.RUNNER_DATA. It isn't a module
// and we don't want it to become one, because the HTML game loads it with a
// plain <script> tag and that has to keep working. So we run it in a vm
// context with a fake `window` and read the object back out.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const GAME_DATA = fileURLToPath(new URL('../../game-data.js', import.meta.url));

export async function loadGameData() {
  const source = await readFile(GAME_DATA, 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  new vm.Script(source, { filename: 'game-data.js' }).runInContext(sandbox);

  const data = sandbox.window.RUNNER_DATA;
  if (!data) throw new Error('game-data.js ran but did not set window.RUNNER_DATA');
  return data;
}
