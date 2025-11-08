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
    method: string,
    body: unknown,
    authorization?: string,
  ): Promise<unknown> {
    const url = `${baseURL}${path}`;

    this.logger.debug(`Proxying ${method} request to ${url}`);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (authorization) {
      headers.Authorization = authorization;
    }

    let response;
    if (method === "GET") {
      response = await firstValueFrom(
        this.httpService.get(url, { headers }),
      );
    } else {
      response = await firstValueFrom(
        this.httpService.post(url, body, { headers }),
      );
    }

    return response.data;
  }
}

