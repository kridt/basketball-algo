import config from '../config/env.js';

class Logger {
  constructor() {
    this.enabled = config.enableLogging;
  }

  info(message, ...args) {
    if (!this.enabled) return;
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  }

  error(message, ...args) {
    if (!this.enabled) return;
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
  }

  warn(message, ...args) {
    if (!this.enabled) return;
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  }

  debug(message, ...args) {
    if (!this.enabled || config.nodeEnv !== 'development') return;
    console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
  }

  success(message, ...args) {
    if (!this.enabled) return;
    console.log(`[SUCCESS] ${new Date().toISOString()} - ✓ ${message}`, ...args);
  }
}

export default new Logger();
