export interface SendMessageDto {
  to: string;
  text: string;
}

export interface IWhatsAppClient {
  sendMessage(dto: SendMessageDto): Promise<void>;
}
