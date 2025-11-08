import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";

import { AuthModule } from "@/server/auth/auth.module";

import { OpenAIController } from "./openai.controller";
import { OpenAIService } from "./openai.service";

@Module({
  imports: [HttpModule, AuthModule],
  controllers: [OpenAIController],
  providers: [OpenAIService],
})
export class OpenAIModule {}

