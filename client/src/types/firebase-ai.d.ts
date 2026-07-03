declare module "firebase/ai" {
  export function getAI(app: any, options?: any): any;
  export function getGenerativeModel(ai: any, options: any): any;
  export class GoogleAIBackend {
    constructor();
  }
}
