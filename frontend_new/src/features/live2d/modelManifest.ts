export interface ModelEntry {
  id: string;
  name: string;
  modelPath: string;
  idleMotionGroup?: string;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}

export const modelManifest: ModelEntry[] = [
  {
    id: "haru",
    name: "Haru",
    modelPath: "/assets/live2d/Haru/Haru.model3.json",
    idleMotionGroup: "Idle",
  },
  {
    id: "hiyori",
    name: "Hiyori",
    modelPath: "/assets/live2d/Hiyori/Hiyori.model3.json",
    idleMotionGroup: "Idle",
  },
  {
    id: "haru-ja",
    name: "Haru JA",
    modelPath: "/assets/live2d/HaruJA/haru.model3.json",
    idleMotionGroup: "Idle",
    scale: 1.02,
  },
  {
    id: "chitose",
    name: "Chitose",
    modelPath: "/assets/live2d/Chitose/chitose.model3.json",
    idleMotionGroup: "Idle",
    scale: 1.02,
  },
  {
    id: "871",
    name: "871",
    modelPath: "/assets/live2d/871_Model/871_0.model3.json",
    idleMotionGroup: "Idle",
    scale: 1.08,
    offsetY: -0.04,
  },
  {
    id: "z",
    name: "Z",
    modelPath: "/assets/live2d/1113_Model/Z.model3.json",
    idleMotionGroup: "Idle",
    scale: 1.02,
  },
  {
    id: "ruanmei",
    name: "阮梅",
    modelPath: "/assets/live2d/RuanMei/1208阮梅1-12.20 - 动画.model3.json",
    idleMotionGroup: "Idle",
  },
  {
    id: "betasmodel",
    name: "BetaSmodel",
    modelPath: "/assets/live2d/BetaSmodel/儀乕僞斉壞.model3.json",
    idleMotionGroup: "Idle",
    scale: 0.96,
  },
  {
    id: "kirinkirinja",
    name: "Kirin Kirinja",
    modelPath: "/assets/live2d/KirinKirinja/Kirin Kirinja.model3.json",
    idleMotionGroup: "Idle",
    scale: 0.98,
  },
  {
    id: "osagegirl",
    name: "Osage Girl",
    modelPath: "/assets/live2d/OsageGirl/osagegirl.model3.json",
    idleMotionGroup: "Idle",
    scale: 1.08,
    offsetY: -0.03,
  },
  {
    id: "halfdemonelf",
    name: "Half-Demon Elf",
    modelPath: "/assets/live2d/HalfDemonElf/165 221.model3.json",
    idleMotionGroup: "Idle",
    scale: 0.92,
    offsetY: -0.04,
  },
];
