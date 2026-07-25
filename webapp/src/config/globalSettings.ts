/**
 * Global settings that control which dictionaries are available.
 * In the build pipeline, this file is generated with publicOnly: true/false
 * depending on whether private dictionaries are included.
 */

interface GlobalSettings {
  publicOnly: boolean;
}

export const GLOBAL_SETTINGS: GlobalSettings = {
  publicOnly: import.meta.env.VITE_PUBLIC_ONLY === 'true',
};
