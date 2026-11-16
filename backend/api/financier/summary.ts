import { handleFinancierRequest } from "./index.ts";

export async function GET(req: Request) {
  return handleFinancierRequest(req);
}

export default GET;
