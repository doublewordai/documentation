export type ModelReference = {
  id: string;
  name: string;
};

export type ReplacementSegment = ModelReference | string;

export type ModelDeprecation = ModelReference & {
  replacement: ReplacementSegment[];
};

export const SCHEDULED_FOR_DEPRECATION_ANCHOR = "scheduled-for-deprecation";

const DEEPSEEK_V4_FLASH_0731 = { id: "deepseek-ai/DeepSeek-V4-Flash-0731", name: "DeepSeek V4 Flash 0731" };
const DEEPSEEK_V4_1_FLASH = { id: "deepseek-ai/DeepSeek-V4.1-Flash", name: "DeepSeek V4.1 Flash" };
const DEEPSEEK_V4_PRO_0813 = { id: "deepseek-ai/DeepSeek-V4-Pro-0813", name: "DeepSeek V4 Pro 0813" };
const GLM_5_3 = { id: "zai-org/GLM-5.3", name: "GLM 5.3" };
const KIMI_K3 = { id: "moonshotai/kimi-k3", name: "Kimi K3" };
const GEMMA_4_31B_IT = { id: "google/gemma-4-31B-it", name: "Gemma 4 31B IT" };
const MUSE_GLIMMER_30B = { id: "meta-models/Muse-Glimmer-30B", name: "Muse Glimmer 30B" };
const NEMOTRON_3_ULTRA = { id: "nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-NVFP4", name: "Nemotron 3 Ultra 550B A55B" };
const LIGHTONOCR_2_1B = { id: "lightonai/LightOnOCR-2-1B-bbox-soup", name: "LightOnOCR 2 1B bbox soup" };
const QWEN3_VL_235B = { id: "Qwen/Qwen3-VL-235B-A22B-Instruct-FP8", name: "Qwen3 VL 235B A22B Instruct" };
const QWEN3_8_27B = { id: "Qwen/Qwen3.8-27B-FP8", name: "Qwen3.8 27B" };
const QWEN3_5_35B_DOTTXT = { id: "Qwen/Qwen3.5-35B-A3B-FP8-dottxt", name: "Qwen3.5 35B A3B dottxt" };

export const MODEL_DEPRECATIONS: ModelDeprecation[] = [
  { id: "deepseek-ai/DeepSeek-V4-Flash", name: "DeepSeek V4 Flash", replacement: [DEEPSEEK_V4_FLASH_0731] },
  { id: "deepseek-ai/DeepSeek-V4-Pro", name: "DeepSeek V4 Pro", replacement: [DEEPSEEK_V4_PRO_0813] },
  { id: "deepseek-ai/DeepSeek-OCR-2", name: "DeepSeek OCR 2", replacement: [LIGHTONOCR_2_1B] },
  { id: "google/gemma-4-26B-A4B-it", name: "Gemma 4 26B A4B", replacement: [MUSE_GLIMMER_30B] },
  { id: "zai-org/GLM-5.1-FP8", name: "GLM 5.1", replacement: [GLM_5_3] },
  { id: "openai/gpt-oss-20b", name: "GPT OSS 20B", replacement: [DEEPSEEK_V4_FLASH_0731] },
  {
    id: "openai/gpt-oss-120b",
    name: "GPT OSS 120B",
    replacement: [DEEPSEEK_V4_1_FLASH, ", or ", GEMMA_4_31B_IT, " if you need a model from a US developer"],
  },
  { id: "tencent/Hy3-FP8", name: "Hy3", replacement: [DEEPSEEK_V4_1_FLASH] },
  { id: "thinkingmachines/Inkling-NVFP4", name: "Inkling", replacement: [NEMOTRON_3_ULTRA] },
  {
    id: "moonshotai/Kimi-K2.6",
    name: "Kimi K2.6",
    replacement: [GLM_5_3, ". ", KIMI_K3, " is the upgrade option within the Kimi family."],
  },
  { id: "XiaomiMiMo/MiMo-V2.5-Pro", name: "MiMo V2.5 Pro", replacement: [DEEPSEEK_V4_1_FLASH] },
  { id: "nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4", name: "Nemotron 3 Super 120B A12B", replacement: [MUSE_GLIMMER_30B] },
  { id: "allenai/olmOCR-2-7B-1025-FP8", name: "olmOCR 2 7B 1025", replacement: [LIGHTONOCR_2_1B] },
  { id: "Qwen/Qwen3-14B-FP8", name: "Qwen3 14B", replacement: [DEEPSEEK_V4_FLASH_0731] },
  { id: "Qwen/Qwen3-VL-30B-A3B-Instruct-FP8", name: "Qwen3 VL 30B A3B Instruct", replacement: [QWEN3_VL_235B] },
  { id: "Qwen/Qwen3.5-4B", name: "Qwen3.5 4B", replacement: [DEEPSEEK_V4_FLASH_0731] },
  { id: "Qwen/Qwen3.5-9B", name: "Qwen3.5 9B", replacement: [DEEPSEEK_V4_FLASH_0731] },
  { id: "Qwen/Qwen3.5-397B-A17B-FP8", name: "Qwen3.5 397B A17B", replacement: [QWEN3_8_27B] },
  { id: "Qwen/Qwen3.5-9B-dottxt", name: "Qwen3.5 9B dottxt", replacement: [QWEN3_5_35B_DOTTXT] },
  { id: "Qwen/Qwen3.5-397B-A17B-FP8-dottxt", name: "Qwen3.5 397B A17B dottxt", replacement: [QWEN3_5_35B_DOTTXT] },
];
