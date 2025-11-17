// Extend Window interface for custom properties
declare global {
  interface Window {
    __timeout_warnings?: Set<string>;
    __backend_timeout_logged?: boolean;
  }
}

export {};

