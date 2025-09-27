import { AppAPI } from "../shared/types";

declare global {
  const api: AppAPI;
  interface Window {
    api: AppAPI;
  }
}
export {};
