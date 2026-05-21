import { Injectable } from '@nestjs/common';
import { google } from '@ai-sdk/google';
import { streamText, LanguageModel, embed, StreamTextResult, EmbedResult } from 'ai';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
  private model: LanguageModel;
  private embeddingModel = google.textEmbeddingModel('text-embedding-004');

  constructor(private prisma: PrismaService) {
    this.model = google('gemini-1.5-pro-latest');
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: this.embeddingModel,
      value: text,
    });
    return embedding;
  }

  async saveDocument(content: string, organizationId: string): Promise<void> {
    const embedding = await this.generateEmbedding(content);
    
    // Using Prisma $executeRaw because vector fields are Unsupported
    await this.prisma.client.$executeRaw`
      INSERT INTO "Document" ("id", "content", "embedding", "organizationId", "updatedAt")
      VALUES (gen_random_uuid(), ${content}, ${embedding}::vector, ${organizationId}, NOW())
    `;
  }

  async generateChatResponse(messages: any[], organizationId: string): Promise<StreamTextResult<any, any>> {
    return streamText({
      model: this.model,
      messages,
      system: `You are a helpful AI assistant for the organization ${organizationId}. 
               You have access only to documents belonging to this organization.
               Always maintain a professional tone and provide accurate information.`,
    });
  }
}
