import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL } from "../constants/llm";

type OpenAIStore = {
  baseURL: string | null;
  setBaseURL: (baseURL: string | null) => void;
  apiKey: string | null;
  setApiKey: (apiKey: string | null) => void;
  model: string | null;
  setModel: (model: string | null) => void;
  maxTokens: number | null;
  setMaxTokens: (maxTokens: number | null) => void;
  includeResumeContext: boolean;
  setIncludeResumeContext: (includeResumeContext: boolean) => void;
  useDefaultTemperature: boolean;
  setUseDefaultTemperature: (useDefaultTemperature: boolean) => void;
  temperatureImprove: number;
  setTemperatureImprove: (temperature: number) => void;
  temperatureFix: number;
  setTemperatureFix: (temperature: number) => void;
  temperatureChangeTone: number;
  setTemperatureChangeTone: (temperature: number) => void;
};

export const useOpenAiStore = create<OpenAIStore>()(
  persist(
    (set) => ({
      baseURL: null,
      setBaseURL: (baseURL: string | null) => {
        set({ baseURL });
      },
      apiKey: null,
      setApiKey: (apiKey: string | null) => {
        set({ apiKey });
      },
      model: DEFAULT_MODEL,
      setModel: (model: string | null) => {
        set({ model });
      },
      maxTokens: DEFAULT_MAX_TOKENS,
      setMaxTokens: (maxTokens: number | null) => {
        set({ maxTokens });
      },
      includeResumeContext: true,
      setIncludeResumeContext: (includeResumeContext: boolean) => {
        set({ includeResumeContext });
      },
      useDefaultTemperature: true,
      setUseDefaultTemperature: (useDefaultTemperature: boolean) => {
        set({ useDefaultTemperature });
      },
      temperatureImprove: 0.7,
      setTemperatureImprove: (temperature: number) => {
        set({ temperatureImprove: temperature });
      },
      temperatureFix: 0.3,
      setTemperatureFix: (temperature: number) => {
        set({ temperatureFix: temperature });
      },
      temperatureChangeTone: 0.7,
      setTemperatureChangeTone: (temperature: number) => {
        set({ temperatureChangeTone: temperature });
      },
    }),
    { name: "openai" },
  ),
);
