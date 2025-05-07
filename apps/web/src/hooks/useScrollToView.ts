import {useEffect, useRef} from "react";
import {Message} from "ai";

export function useScrollToView(messages: Message[]) {
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({behavior: 'smooth'});
    }
  }, [messages]);

  return messageEndRef;
}
