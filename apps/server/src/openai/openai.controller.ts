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
    @Body() body: { baseURL: string; path: string; body: unknown },
    @Headers("authorization") authorization?: string,
  ) {
    try {
      return await this.openAIService.proxyRequest(body.baseURL, body.path, body.body, authorization);
    } catch (error) {
      // If it's an axios error with a response, forward the status and data
      if (error && typeof error === "object" && "isAxiosError" in error) {
        const axiosError = error as AxiosError<unknown>;
        if (axiosError.response) {
          throw new HttpException(
            axiosError.response.data,
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

