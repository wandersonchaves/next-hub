"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Send } from "lucide-react";

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  handleSendMessage: () => void;
  handleGeneratePitch: () => void;
  isSubmitting: boolean;
}

export function ChatInput({
  inputText,
  setInputText,
  handleSendMessage,
  handleGeneratePitch,
  isSubmitting,
}: ChatInputProps) {
  return (
    <div className="flex items-end gap-2 max-w-3xl mx-auto">
      <button
        type="button"
        onClick={handleGeneratePitch}
        disabled={isSubmitting}
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shrink-0 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all"
      >
        {isSubmitting ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          <Sparkles size={20} className="text-yellow-200" />
        )}
      </button>
      <div className="flex-1 relative flex">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Digite sua mensagem estratégica..."
          className="w-full flex-1 break-words whitespace-pre-wrap px-4 py-3 border rounded-2xl bg-muted/20 text-sm outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-all scrollbar-hide"
          rows={Math.min(inputText.split('\n').length, 5)}
        />
      </div>
      <Button
        onClick={handleSendMessage}
        disabled={isSubmitting || !inputText.trim()}
        size="icon"
        className="h-12 w-12 rounded-2xl shrink-0 shadow-lg bg-primary hover:bg-primary/90 shadow-primary/20"
      >
        {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
      </Button>
    </div>
  );
}
