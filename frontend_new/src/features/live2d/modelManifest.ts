export interface ModelEntry {
  id: string;
  name: string;
  /** model3.json 文件的路径（相对于 public/ 目录） */
  modelPath: string;
  /** 可选：待机动作组名 */
  idleMotionGroup?: string;
}

/**
 * Live2D 模型清单
 *
 * 模型文件需放置在 public/assets/live2d/ 下，
 * 每个模型一个子目录，内含 model3.json、.moc3、textures/ 等。
 *
 * 示例模型可从 Live2D 官网免费下载：
 *   https://www.live2d.com/download/sample-data/
 */
export const modelManifest: ModelEntry[] = [
  {
    id: "haru",
    name: "Haru (示例模型)",
    modelPath: "/assets/live2d/Haru/Haru.model3.json",
    idleMotionGroup: "Idle",
  },
  {
    id: "hiyori",
    name: "Hiyori (示例模型)",
    modelPath: "/assets/live2d/Hiyori/Hiyori.model3.json",
    idleMotionGroup: "Idle",
  },

  // --- 从下载目录导入的 Live2D 模型 ---

  {
    id: "871",
    name: "871 模型 (VTS)",
    modelPath: "/assets/live2d/871_Model/871_0.model3.json",
    idleMotionGroup: "Idle",
  },
  {
    id: "z",
    name: "Z 模型",
    modelPath: "/assets/live2d/1113_Model/Z.model3.json",
    idleMotionGroup: "Idle",
  },
  {
    id: "ruanmei",
    name: "阮梅 (Ruan Mei)",
    modelPath: "/assets/live2d/RuanMei/1208阮梅1-12.20 - 动画.model3.json",
    idleMotionGroup: "Idle",
  },
  {
    id: "betasmodel",
    name: "BetaSmodel (VTS)",
    modelPath: "/assets/live2d/BetaSmodel/儀乕僞斉壞.model3.json",
    idleMotionGroup: "Idle",
  },
  {
    id: "kirinkirinja",
    name: "Kirin Kirinja (VTS)",
    modelPath: "/assets/live2d/KirinKirinja/Kirin Kirinja.model3.json",
    idleMotionGroup: "Idle",
  },
  {
    id: "osagegirl",
    name: "Osage Girl (おさげの少女)",
    modelPath: "/assets/live2d/OsageGirl/osagegirl.model3.json",
    idleMotionGroup: "Idle",
  },
  {
    id: "halfdemonelf",
    name: "Half-Demon Elf",
    modelPath: "/assets/live2d/HalfDemonElf/165 221.model3.json",
    idleMotionGroup: "Idle",
  },
];
