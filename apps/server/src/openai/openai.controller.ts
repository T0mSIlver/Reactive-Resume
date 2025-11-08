import { Body, Controller, Headers, HttpException, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AxiosError } from "axios";

import { TwoFactorGuard } from "@/server/auth/guards/two-factor.guard";

import { OpenAIService } from "./openai.service";

@ApiTags("OpenAI")
@Controller("openai")
export class OpenAIController {
  constructor(private readonly openAIService: OpenAIService) {}

  /**
   * Proxy endpoint for OpenAI-compatible APIs (like LM Studio) that don't support CORS preflight OPTIONS requests.
   * This endpoint forwards requests to the specified baseURL, avoiding CORS issues by making server-to-server requests.
   */
  @Post("proxy")
  @UseGuards(TwoFactorGuard)
  async proxy(
    @Body() body: { baseURL: string; path: string; method?: string; body?: unknown },
    @Headers("authorization") authorization?: string,
  ) {
    try {
      // Use the method from the request body, defaulting to POST for backward compatibility
      // The OpenAI SDK sets method explicitly (GET for models.list(), POST for chat.completions)
      const method = body.method || "POST";
      return await this.openAIService.proxyRequest(body.baseURL, body.path, method, body.body, authorization);
    } catch (error) {
      // If it's an axios error with a response, forward the status and data
      if (error && typeof error === "object" && "isAxiosError" in error) {
        const axiosError = error as AxiosError<unknown>;
        if (axiosError.response) {
          const errorData = typeof axiosError.response.data === "string" || 
                           (typeof axiosError.response.data === "object" && axiosError.response.data !== null)
            ? axiosError.response.data 
            : { error: { message: "Unknown error" } };
          throw new HttpException(
            errorData,
            axiosError.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }
      // Otherwise, throw a generic error
      throw new HttpException(
        { error: { message: "Failed to proxy request to OpenAI-compatible API" } },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

