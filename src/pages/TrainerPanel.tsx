import { useState } from "react";
import { TrainerPanel, createDemoTrainerApi, createHttpTrainerApi, type TrainerApi } from "../components/academy";

const apiUrl = import.meta.env.VITE_ACADEMY_API_URL as string | undefined;

/**
 * Uses the academy API when VITE_ACADEMY_API_URL is configured. Until a backend exists, the panel runs on
 * an in-browser demo store and says so on screen.
 */
export default function TrainerPanelPage() {
  const [setup] = useState<{ api: TrainerApi; reset?: () => void }>(() => {
    if (apiUrl) return { api: createHttpTrainerApi({ baseUrl: apiUrl }) };
    const demo = createDemoTrainerApi();
    return { api: demo, reset: () => demo.reset() };
  });
  return <TrainerPanel api={setup.api} onResetDemo={setup.reset}/>;
}
