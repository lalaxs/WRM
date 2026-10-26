'use strict';

// game-persist.js — split placeholder.
// Save / offline settle / persistenceRecovery currently live in game.js.
//
// Do not redeclare top-level bindings that game.js already defines
// (persistenceRecovery, isPersistenceLocked, persistModel, commitModel, …).
// A duplicate `const persistenceRecovery` aborts this entire script in the
// browser and breaks commands such as confirmCreate.
