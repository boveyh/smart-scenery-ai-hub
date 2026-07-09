export interface ModelEntry {
  id: string;
  name: string;
  url: string;
  idleAnimationUrl?: string;
}

export const modelManifest: ModelEntry[] = [
  {
    id: "default",
    name: "导游常服",
    url: "/assets/vrm/guide-default.vrm",
    idleAnimationUrl: "/assets/animations/idle_loop.vrma",
  },
  {
    id: "hanfu",
    name: "汉服导游",
    url: "/assets/vrm/guide-hanfu.vrm",
    idleAnimationUrl: "/assets/animations/idle_loop.vrma",
  },
];