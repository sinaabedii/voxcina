'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

interface GoogleAnalyticsProps {
  gaId: string;
}

export default function GoogleAnalytics({ gaId }: GoogleAnalyticsProps) {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const enableAnalytics = () => setShouldLoad(true);
    const interactionEvents = ['pointerdown', 'keydown', 'touchstart'];

    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, enableAnalytics, {
        once: true,
        passive: true,
      });
    });

    // Preserve page-view tracking for passive visitors without competing with
    // the hero, fonts, and other first-paint resources.
    const timer = window.setTimeout(enableAnalytics, 5000);

    return () => {
      window.clearTimeout(timer);
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, enableAnalytics);
      });
    };
  }, []);

  if (!shouldLoad) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_title: document.title,
              page_location: window.location.href,
            });
          `,
        }}
      />
    </>
  );
}
