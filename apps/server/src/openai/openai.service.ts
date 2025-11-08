import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { firstValueFrom } from "rxjs";

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Proxy a request to an OpenAI-compatible API endpoint.
   * This avoids CORS issues by making server-to-server requests.
   */
  async proxyRequest(
    baseURL: string,
    path: string,
    body: unknown,
    authorization?: string,
  ): Promise<unknown> {
    const url = `${baseURL}${path}`;

    this.logger.debug(`Proxying request to ${url}`);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (authorization) {
      headers.Authorization = authorization;
    }

    const response = await firstValueFrom(
      this.httpService.post(url, body, { headers }),
    );

    return response.data;
  }
}

