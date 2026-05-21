'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function AiChatPage() {
  const { orgSlug } = useParams();

  const chat: any = useChat({
    api: '/api/chat',
    body: {
      orgSlug,
    },
    headers: {
      'x-org-slug': orgSlug as string,
    },
  } as any);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = chat;

  return (
    <div className="flex flex-col w-full max-w-2xl py-24 mx-auto stretch">
      <h1 className="text-2xl font-bold mb-8">AI Assistant</h1>

      <div className="space-y-4 mb-8">
        {messages.map((m: any) => (
          <div key={m.id} className={`whitespace-pre-wrap ${m.role === 'user' ? 'text-blue-600' : 'text-gray-800'}`}>
            <span className="font-bold">{m.role === 'user' ? 'You: ' : 'AI: '}</span>
            {m.content}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="fixed bottom-0 w-full max-w-2xl p-4 mb-8 border border-gray-300 rounded shadow-xl bg-background">
        <input
          className="w-full p-2 outline-none"
          value={input}
          placeholder="Ask something..."
          onChange={handleInputChange}
          disabled={isLoading}
        />
      </form>
    </div>
  );
}
