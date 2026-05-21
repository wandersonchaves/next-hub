'use client';

import React, { useRef, useEffect } from 'react';

interface WidgetProps {
  url: string;
  organizationId: string;
  config?: any;
}

export function WidgetContainer({ url, organizationId, config }: WidgetProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // In production, validate event.origin for security
      console.log('[Widget Host] Received message:', event.data);
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const onLoad = () => {
    // Inject context into the widget once it's loaded
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'INIT_CONTEXT',
        organizationId,
        config,
      }, '*');
    }
  };

  return (
    <div className="w-full h-[400px] border rounded-lg overflow-hidden bg-white shadow-sm">
      <iframe
        ref={iframeRef}
        src={url}
        className="w-full h-full border-none"
        sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
        onLoad={onLoad}
      />
    </div>
  );
}
