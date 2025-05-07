import {ReactNode} from "react";
import { createAI } from 'ai/rsc';


export const AIContext = createAI<any[], ReactNode[]>({
  initialUIState: [],
  initialAIState: [],
  actions: { submitUserMessage },
});
