'use strict';

// game-runtime.js — split placeholder.
// simulate / tick / render / boot currently live in game.js.
//
// Do not redeclare top-level bindings that game.js already defines
// (hiddenTicker, simulateModel, advanceRuntime, render, …).
// A duplicate `let hiddenTicker` aborts this entire script in the browser.
