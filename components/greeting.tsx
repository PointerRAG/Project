"use client";

import { useState, useEffect } from "react";
import { getGreeting } from "@/lib/greetings";

interface GreetingProps {
  userName: string;
}

export function Greeting({ userName }: GreetingProps) {
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    setGreeting(getGreeting(userName));
  }, [userName]);

  // Render transparent placeholder on server / before hydration to avoid layout shift
  if (greeting === null) {
    return <h2 className="mb-2 text-3xl font-semibold invisible">Welcome</h2>;
  }

  return <h2 className="mb-2 text-3xl font-semibold">{greeting}</h2>;
}
