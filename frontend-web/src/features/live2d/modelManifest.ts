export interface ModelEntry {
  id: string;
  name: string;
  /** Path to model3.json, relative to public/. */
  modelPath: string;
  /** Optional idle motion group name. */
  idleMotionGroup?: string;
  /** Display scale and offsets for per-model composition tuning. */
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  /** Default edge-tts voice preset for this model. */
  defaultTtsVoice: string;
  defaultTtsRate: string;
  defaultTtsPitch: string;
}

export const modelManifest: ModelEntry[] = [
  {
    id: "haru",
    name: "Haru (sample)",
    modelPath: "/assets/live2d/Haru/Haru.model3.json",
    idleMotionGroup: "Idle",
    defaultTtsVoice: "zh-CN-XiaoxiaoNeural",
    defaultTtsRate: "+10%",
    defaultTtsPitch: "+0Hz",
  },
  {
    id: "hiyori",
    name: "Hiyori (sample)",
    modelPath: "/assets/live2d/Hiyori/Hiyori.model3.json",
    idleMotionGroup: "Idle",
    defaultTtsVoice: "zh-CN-XiaohanNeural",
    defaultTtsRate: "+0%",
    defaultTtsPitch: "+0Hz",
  },
  {
    id: "haru-ja",
    name: "Haru JA",
    modelPath: "/assets/live2d/HaruJA/haru.model3.json",
    idleMotionGroup: "Idle",
    scale: 1.02,
    defaultTtsVoice: "zh-CN-XiaoxiaoNeural",
    defaultTtsRate: "+10%",
    defaultTtsPitch: "+0Hz",
  },
  {
    id: "chitose",
    name: "Chitose",
    modelPath: "/assets/live2d/Chitose/chitose.model3.json",
    idleMotionGroup: "Idle",
    scale: 1.02,
    defaultTtsVoice: "zh-CN-YunxiNeural",
    defaultTtsRate: "+0%",
    defaultTtsPitch: "+0Hz",
  },
  {
    id: "871",
    name: "871 (VTS)",
    modelPath: "/assets/live2d/871_Model/871_0.model3.json",
    idleMotionGroup: "Idle",
    scale: 1.08,
    offsetY: -0.04,
    defaultTtsVoice: "zh-CN-XiaoyiNeural",
    defaultTtsRate: "+0%",
    defaultTtsPitch: "-10Hz",
  },
  {
    id: "z",
    name: "Z",
    modelPath: "/assets/live2d/1113_Model/Z.model3.json",
    idleMotionGroup: "Idle",
    scale: 1.02,
    defaultTtsVoice: "zh-CN-XiaochenNeural",
    defaultTtsRate: "+0%",
    defaultTtsPitch: "-10Hz",
  },
  {
    id: "betasmodel",
    name: "BetaSmodel (VTS)",
    modelPath: "/assets/live2d/BetaSmodel/儀乕僞斉壞.model3.json",
    idleMotionGroup: "Idle",
    scale: 0.96,
    defaultTtsVoice: "zh-CN-XiaoshuangNeural",
    defaultTtsRate: "+15%",
    defaultTtsPitch: "+5Hz",
  },
  {
    id: "kirinkirinja",
    name: "Kirin Kirinja (VTS)",
    modelPath: "/assets/live2d/KirinKirinja/Kirin Kirinja.model3.json",
    idleMotionGroup: "Idle",
    scale: 0.98,
    defaultTtsVoice: "zh-CN-XiaochenNeural",
    defaultTtsRate: "+5%",
    defaultTtsPitch: "+5Hz",
  },
  {
    id: "osagegirl",
    name: "Osage Girl",
    modelPath: "/assets/live2d/OsageGirl/osagegirl.model3.json",
    idleMotionGroup: "Idle",
    scale: 1.08,
    offsetY: -0.03,
    defaultTtsVoice: "zh-CN-XiaohanNeural",
    defaultTtsRate: "-10%",
    defaultTtsPitch: "+0Hz",
  },
  {
    id: "halfdemonelf",
    name: "Half-Demon Elf",
    modelPath: "/assets/live2d/HalfDemonElf/165 221.model3.json",
    idleMotionGroup: "Idle",
    scale: 0.92,
    offsetY: -0.04,
    defaultTtsVoice: "zh-CN-XiaochenNeural",
    defaultTtsRate: "+0%",
    defaultTtsPitch: "-10Hz",
  },
];
