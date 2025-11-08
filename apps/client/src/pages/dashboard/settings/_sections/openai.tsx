import { zodResolver } from "@hookform/resolvers/zod";
import { t, Trans } from "@lingui/macro";
import { ArrowClockwise, TrashSimple } from "@phosphor-icons/react";
import {
  Alert,
  Button,
  Combobox,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Slider,
  Switch,
} from "@reactive-resume/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL } from "@/client/constants/llm";
import { useOpenAiStore } from "@/client/stores/openai";
import { openai } from "@/client/services/openai/client";

const formSchema = z.object({
  apiKey: z
    .string()
    // eslint-disable-next-line lingui/no-unlocalized-strings
    .min(1, "API key cannot be empty.")
    .default(""),
  baseURL: z
    .string()
    // eslint-disable-next-line lingui/no-unlocalized-strings
    .regex(/^https?:\/\/\S+$/, "That doesn't look like a valid URL")
    .or(z.literal(""))
    .default(""),
  model: z.string().default(DEFAULT_MODEL),
  maxTokens: z.number().default(DEFAULT_MAX_TOKENS),
  includeResumeContext: z.boolean().default(true),
  useDefaultTemperature: z.boolean().default(true),
  temperatureImprove: z.number().min(0).max(2).default(0.7),
  temperatureFix: z.number().min(0).max(2).default(0.3),
  temperatureChangeTone: z.number().min(0).max(2).default(0.7),
});

type FormValues = z.infer<typeof formSchema>;

export const OpenAISettings = () => {
  const {
    apiKey,
    setApiKey,
    baseURL,
    setBaseURL,
    model,
    setModel,
    maxTokens,
    setMaxTokens,
    includeResumeContext,
    setIncludeResumeContext,
    useDefaultTemperature,
    setUseDefaultTemperature,
    temperatureImprove,
    setTemperatureImprove,
    temperatureFix,
    setTemperatureFix,
    temperatureChangeTone,
    setTemperatureChangeTone,
  } = useOpenAiStore();

  // State for models dropdown
  const [models, setModels] = useState<Array<{ value: string; label: string }>>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  // Function to fetch models using OpenAI SDK (automatically uses GET)
  const fetchModels = async () => {
    if (!apiKey) {
      setModelError(t`Please enter an API key first.`);
      return;
    }

    setIsLoadingModels(true);
    setModelError(null);

    try {
      const client = openai();
      // SDK's models.list() automatically uses GET request
      const response = await client.models.list();
      
      // Extract model IDs and create options
      const currentModel = model || form.getValues("model");
      const modelOptions = response.data
        .map((model) => ({
          value: model.id,
          label: model.id,
        }))
        .filter((m) => {
          // Remove default model if it's not in the API response
          // Only keep it if it's actually returned by the API
          return true;
        })
        .sort((a, b) => a.label.localeCompare(b.label));

      setModels(modelOptions);
      
      // If current model is not in the fetched list, add it (but not if it's the default)
      // This allows custom models to be preserved, but prevents selecting default if not available
      if (currentModel && 
          currentModel !== DEFAULT_MODEL && 
          !modelOptions.find((m) => m.value === currentModel)) {
        setModels([
          { value: currentModel, label: currentModel },
          ...modelOptions,
        ]);
      } else if (currentModel === DEFAULT_MODEL && !modelOptions.find((m) => m.value === DEFAULT_MODEL)) {
        // If current model is default but not in API response, clear it or set to first available
        if (modelOptions.length > 0) {
          const firstModel = modelOptions[0].value;
          form.setValue("model", firstModel);
          setModel(firstModel);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t`Failed to fetch models.`;
      setModelError(errorMessage);
      console.error("Error fetching models:", error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apiKey: apiKey ?? "",
      baseURL: baseURL ?? "",
      model: model ?? DEFAULT_MODEL,
      maxTokens: maxTokens ?? DEFAULT_MAX_TOKENS,
      includeResumeContext: includeResumeContext ?? true,
      useDefaultTemperature: useDefaultTemperature ?? true,
      temperatureImprove: temperatureImprove ?? 0.7,
      temperatureFix: temperatureFix ?? 0.3,
      temperatureChangeTone: temperatureChangeTone ?? 0.7,
    },
  });

  const saveSettings = useCallback(({
    apiKey,
    baseURL,
    model,
    maxTokens,
    includeResumeContext,
    useDefaultTemperature,
    temperatureImprove,
    temperatureFix,
    temperatureChangeTone,
  }: FormValues) => {
    setApiKey(apiKey);
    if (baseURL) {
      setBaseURL(baseURL);
    }
    if (model) {
      setModel(model);
    }
    if (maxTokens) {
      setMaxTokens(maxTokens);
    }
    setIncludeResumeContext(includeResumeContext);
    setUseDefaultTemperature(useDefaultTemperature);
    setTemperatureImprove(temperatureImprove);
    setTemperatureFix(temperatureFix);
    setTemperatureChangeTone(temperatureChangeTone);
  }, [
    setApiKey,
    setBaseURL,
    setModel,
    setMaxTokens,
    setIncludeResumeContext,
    setUseDefaultTemperature,
    setTemperatureImprove,
    setTemperatureFix,
    setTemperatureChangeTone,
  ]);

  // Auto-save when form values change
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const subscription = form.watch((value) => {
      // Clear any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Only save if the form is valid
      if (form.formState.isValid) {
        // Debounce the save to avoid too many updates
        saveTimeoutRef.current = setTimeout(() => {
          saveSettings(value as FormValues);
        }, 300);
      }
    });
    
    return () => {
      subscription.unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [form, saveSettings]);

  // Default values for comparison
  const defaultValues: FormValues = useMemo(
    () => ({
      apiKey: "",
      baseURL: "",
      model: DEFAULT_MODEL,
      maxTokens: DEFAULT_MAX_TOKENS,
      includeResumeContext: true,
      useDefaultTemperature: true,
      temperatureImprove: 0.7,
      temperatureFix: 0.3,
      temperatureChangeTone: 0.7,
    }),
    [],
  );

  // Watch all form values
  const watchedValues = form.watch();

  // Check if any value differs from default
  const hasChanges = useMemo(() => {
    const current = watchedValues;
    return (
      current.apiKey !== defaultValues.apiKey ||
      current.baseURL !== defaultValues.baseURL ||
      current.model !== defaultValues.model ||
      current.maxTokens !== defaultValues.maxTokens ||
      current.includeResumeContext !== defaultValues.includeResumeContext ||
      current.useDefaultTemperature !== defaultValues.useDefaultTemperature ||
      current.temperatureImprove !== defaultValues.temperatureImprove ||
      current.temperatureFix !== defaultValues.temperatureFix ||
      current.temperatureChangeTone !== defaultValues.temperatureChangeTone
    );
  }, [watchedValues, defaultValues]);

  const onRemove = () => {
    setApiKey(null);
    setBaseURL(null);
    setModel(DEFAULT_MODEL);
    setMaxTokens(DEFAULT_MAX_TOKENS);
    setIncludeResumeContext(true);
    setUseDefaultTemperature(true);
    setTemperatureImprove(0.7);
    setTemperatureFix(0.3);
    setTemperatureChangeTone(0.7);
    form.reset(defaultValues);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold leading-relaxed tracking-tight">{t`OpenAI/OpenWebUI Integration`}</h3>
        <p className="leading-relaxed opacity-75">
          {t`You can make use of the OpenAI API to help you generate content, or improve your writing while composing your resume.`}
        </p>
      </div>

      <div className="prose prose-sm prose-zinc max-w-full dark:prose-invert">
        <p>
          <Trans>
            You have the option to{" "}
            <a
              target="_blank"
              rel="noopener noreferrer nofollow"
              href="https://www.howtogeek.com/885918/how-to-get-an-openai-api-key/"
            >
              obtain your own OpenAI API key
            </a>
            . This key empowers you to leverage the API as you see fit. Alternatively, if you wish
            to disable the AI features in Reactive Resume altogether, you can simply remove the key
            from your settings.
          </Trans>
        </p>

        <p>
          <Trans>
            You can also integrate with OpenWebUI by setting your API key. 1) Login to your local
            OpenWebUI instance. 2) Click on your name in the bottom left corner. 3) Click on
            Settings. 4) Click on Account. 5) Show and copy your API Key. It should look something
            like `sk-1234567890abcdef`. Fill in the Base URL to your OpenWebUI Instance, (i.e.
            `https://localhost:8080/api`).{" "}
            <strong>This must connect over HTTPS and to OpenWebUI, not Ollama.</strong>
            You can also pick and choose models (i.e. `llama3.2:latest`) and set the max tokens as
            per your preference.
          </Trans>
        </p>
      </div>

      <Form {...form}>
        <form className="grid gap-6 sm:grid-cols-2">
          <FormField
            name="apiKey"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t`OpenAI/OpenWebUI API Key`}</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="sk-..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="baseURL"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t`Base URL`}</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="https://localhost:8080/api" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="model"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t`Model`}</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    {models.length > 0 ? (
                      <div className="flex-1">
                        <Combobox
                          {...field}
                          value={field.value}
                          options={models}
                          onValueChange={field.onChange}
                          selectPlaceholder={t`Select a model`}
                          searchPlaceholder={t`Search models...`}
                          emptyText={t`No models found`}
                        />
                      </div>
                    ) : (
                      <Input
                        type="text"
                        placeholder={DEFAULT_MODEL}
                        {...field}
                        className="flex-1"
                      />
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={fetchModels}
                      disabled={isLoadingModels || !form.watch("apiKey")}
                      title={t`Fetch available models`}
                    >
                      <ArrowClockwise
                        className={`size-4 ${isLoadingModels ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </div>
                </FormControl>
                {modelError && (
                  <p className="text-sm text-error">{modelError}</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="maxTokens"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t`Max Tokens`}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={`${DEFAULT_MAX_TOKENS}`}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e.target.valueAsNumber);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="includeResumeContext"
            control={form.control}
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 sm:col-span-2">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">{t`Include Resume Context`}</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    {t`When enabled, the entire resume is sent as context to improve consistency. When disabled, only the text being edited and its immediate context are sent.`}
                  </p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            name="useDefaultTemperature"
            control={form.control}
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 sm:col-span-2">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">{t`Use Default Temperature`}</FormLabel>
                  <FormDescription>
                    {t`When enabled, custom temperature values are sent with each AI request. When disabled, the API will use its default temperature settings.`}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          {form.watch("useDefaultTemperature") && (
            <>
              <FormField
                name="temperatureImprove"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{t`Temperature - Improve Writing`}</FormLabel>
                    <FormDescription>
                      {t`Controls creativity for writing improvements. Lower values (0-0.5) are more focused and consistent, higher values (1-2) are more creative and varied.`}
                    </FormDescription>
                    <FormControl className="py-2">
                      <div className="flex items-center gap-x-4">
                        <Slider
                          min={0}
                          max={2}
                          step={0.1}
                          value={[field.value]}
                          onValueChange={(value) => {
                            field.onChange(value[0]);
                          }}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          min={0}
                          max={2}
                          step={0.1}
                          value={field.value}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val >= 0 && val <= 2) {
                              field.onChange(val);
                            }
                          }}
                          className="w-20"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="temperatureFix"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{t`Temperature - Fix Grammar`}</FormLabel>
                    <FormDescription>
                      {t`Controls precision for grammar fixes. Lower values (0-0.5) are more accurate and conservative, higher values may introduce more changes.`}
                    </FormDescription>
                    <FormControl className="py-2">
                      <div className="flex items-center gap-x-4">
                        <Slider
                          min={0}
                          max={2}
                          step={0.1}
                          value={[field.value]}
                          onValueChange={(value) => {
                            field.onChange(value[0]);
                          }}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          min={0}
                          max={2}
                          step={0.1}
                          value={field.value}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val >= 0 && val <= 2) {
                              field.onChange(val);
                            }
                          }}
                          className="w-20"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="temperatureChangeTone"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{t`Temperature - Change Tone`}</FormLabel>
                    <FormDescription>
                      {t`Controls creativity for tone changes. Lower values (0-0.5) make subtle changes, higher values (1-2) make more dramatic tone shifts.`}
                    </FormDescription>
                    <FormControl className="py-2">
                      <div className="flex items-center gap-x-4">
                        <Slider
                          min={0}
                          max={2}
                          step={0.1}
                          value={[field.value]}
                          onValueChange={(value) => {
                            field.onChange(value[0]);
                          }}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          min={0}
                          max={2}
                          step={0.1}
                          value={field.value}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val >= 0 && val <= 2) {
                              field.onChange(val);
                            }
                          }}
                          className="w-20"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
          <div className="flex items-center justify-center space-x-2 sm:col-span-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onRemove}
              disabled={!hasChanges}
            >
              <TrashSimple className="mr-2" />
              {t`Reset`}
            </Button>
          </div>
        </form>
      </Form>

      <div className="prose prose-sm prose-zinc max-w-full dark:prose-invert">
        <p>
          <Trans>
            Your API key is securely stored in the browser's local storage and is only utilized when
            making requests to OpenAI via their official SDK. Rest assured that your key is not
            transmitted to any external server except when interacting with OpenAI's services.
          </Trans>
        </p>
      </div>

      <Alert variant="warning">
        <div className="prose prose-neutral max-w-full text-xs leading-relaxed text-primary dark:prose-invert">
          <Trans>
            <span className="font-medium">Note: </span>
            By utilizing the OpenAI API, you acknowledge and accept the{" "}
            <a
              href="https://openai.com/policies/terms-of-use"
              rel="noopener noreferrer nofollow"
              target="_blank"
            >
              terms of use
            </a>{" "}
            and{" "}
            <a
              href="https://openai.com/policies/privacy-policy"
              rel="noopener noreferrer nofollow"
              target="_blank"
            >
              privacy policy
            </a>{" "}
            outlined by OpenAI. Please note that Reactive Resume bears no responsibility for any
            improper or unauthorized utilization of the service, and any resulting repercussions or
            liabilities solely rest on the user.
          </Trans>
        </div>
      </Alert>
    </div>
  );
};
