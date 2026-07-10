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
];