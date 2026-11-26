import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// MediaPipe/TFLite WASM writes C++ "INFO: ..." diagnostics to stderr, which Emscripten maps to console.error.
// Downgrade those informational diagnostics to console.debug before any WASM module binds console.error.
const origConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const first = typeof args[0] === 'string' ? args[0] : '';
  if (
    first.startsWith('INFO: Created TensorFlow Lite') ||
    first.startsWith('WARNING: All log messages before absl::InitializeLog()') ||
    /^I\d{4}\s/.test(first)
  ) {
    console.debug(...args);
    return;
  }
  origConsoleError(...args);
};

createRoot(document.getElementById('root')!).render(<App />);
