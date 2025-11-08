import { t } from "@lingui/macro";
import { OpenAI } from "openai";

import { axios } from "@/client/libs/axios";
import { useOpenAiStore } from "@/client/stores/openai";

/**
 * Custom fetch wrapper that proxies requests through the backend to avoid CORS preflight OPTIONS requests.
 * 
 * The browser automatically sends OPTIONS requests for cross-origin requests with custom headers
 * (like Authorization). LM Studio and some other OpenAI-compatible servers don't support OPTIONS,
 * which causes the browser to block the actual POST request.
 * 
 * This wrapper detects when we're making requests to a custom baseURL (not OpenAI's official API)
 * and routes them through our backend proxy endpoint (/api/openai/proxy), which makes server-to-server
 * requests that don't trigger CORS preflight.
 */
const customFetch: typeof fetch = async (input, init) => {
  const url = typeof input === "string" 
    ? input 
    : input instanceof URL 
      ? input.toString()
      : input.url;
  const { baseURL } = useOpenAiStore.getState();
  const isCustomBaseURL = baseURL && url.startsWith(baseURL);
  
  if (!isCustomBaseURL) {
    // For OpenAI's official API, use native fetch (they support CORS properly)
    return fetch(input, init);
  }
  
  // For custom baseURLs (like LM Studio), proxy through our backend to avoid CORS
  // Extract the path from the full URL (e.g., "/v1/chat/completions")
  const path = url.replace(baseURL, "");
  
  // Debug: Log what the SDK is passing
  let headersObj: Record<string, string> | undefined;
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      headersObj = {};
      init.headers.forEach((value, key) => {
        headersObj![key] = value;
      });
    } else if (typeof init.headers === "object") {
      headersObj = init.headers as Record<string, string>;
    }
  }
  console.log("Custom fetch called:", {
    url,
    path,
    method: init?.method,
    hasBody: !!init?.body,
    headers: headersObj,
  });
  
  // Determine HTTP method
  // The fetch API defaults to GET when no method is specified
  // OpenAI SDK should explicitly set method, but if not, we need to infer it
  // - GET: models.list(), no body
  // - POST: chat.completions.create(), has body
  let method: string;
  if (init?.method) {
    // SDK explicitly set the method - use it
    method = init.method;
  } else if (init?.body) {
    // Has body but no method - must be POST (chat completions)
    method = "POST";
  } else {
    // No method and no body - must be GET (models list)
    method = "GET";
  }
  
  const body = init?.body ? JSON.parse(init.body as string) : undefined;
  const authorization = init?.headers
    ? new Headers(init.headers).get("authorization") || undefined
    : undefined;
  
  try {
    // Use axios to call our proxy endpoint (same-origin, no CORS issues)
    const proxyBody = {
      baseURL,
      path,
      method,
      body,
    };
    
    const response = await axios.post("/openai/proxy", proxyBody, {
      headers: authorization ? { authorization } : undefined,
    });
    
    // Return a Response-like object that the OpenAI SDK expects
    return new Response(JSON.stringify(response.data), {
      status: 200,
      statusText: "OK",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    // If the proxy fails, extract error information from axios response
    let status = 500;
    let errorData: unknown = { error: { message: "Unknown error" } };
    
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as { response?: { data?: unknown; status?: number } };
      if (axiosError.response) {
        status = axiosError.response.status || 500;
        errorData = axiosError.response.data || errorData;
      }
    } else if (error instanceof Error) {
      errorData = { error: { message: error.message } };
    }
    
    // Return error response that the OpenAI SDK can handle
    return new Response(JSON.stringify(errorData), {
      status,
      statusText: status === 500 ? "Internal Server Error" : "Error",
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};

export const openai = () => {
  const { apiKey, baseURL } = useOpenAiStore.getState();

  if (!apiKey) {
    throw new Error(
      t`Your OpenAI API Key has not been set yet. Please go to your account settings to enable OpenAI Integration.`,
    );
  }

  const config: ConstructorParameters<typeof OpenAI>[0] = {
    apiKey,
    dangerouslyAllowBrowser: true,
  };

  if (baseURL) {
    config.baseURL = baseURL;
    // Use custom fetch for custom baseURLs to proxy through backend and avoid CORS
    config.fetch = customFetch;
  }

  return new OpenAI(config);
};
